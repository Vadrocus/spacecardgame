/**
 * Space Card Game - Multiplayer Module
 * Handles room creation, joining, and real-time game state sync via Supabase
 */

// Supabase configuration - uses Vigil Games project
const SUPABASE_URL = 'https://vazxjzdvtqknlvnujmuw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhenhqemR2dHFrbmx2bnVqbXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODU0NTksImV4cCI6MjA4MDQ2MTQ1OX0.74d5iczBkRrlHdIexVLzu000OEWCkimh1tiQork7Qu4';

export class Multiplayer {
    constructor() {
        this.supabase = null;
        this.channel = null;
        this.roomId = null;
        this.roomCode = null;
        this.isPlayer1 = true;  // Local player is P1 or P2
        this.playerId = this._generatePlayerId();
        this.opponentId = null;
        this.isConnected = false;
        this.onGameAction = null;  // Callback for received actions
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onError = null;
    }

    async init() {
        // Load Supabase from CDN if not already loaded
        if (!window.supabase) {
            await this._loadSupabaseScript();
        }
        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Multiplayer initialized');
    }

    _loadSupabaseScript() {
        return new Promise((resolve, reject) => {
            if (window.supabase) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    _generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    _generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Create a new game room
     * @returns {Promise<{success: boolean, roomCode?: string, error?: string}>}
     */
    async createRoom() {
        try {
            this.roomCode = this._generateRoomCode();
            this.isPlayer1 = true;

            // Create room in database
            const { data: room, error } = await this.supabase
                .from('game_rooms')
                .insert({
                    id: this.roomCode,  // Use room code as ID for simplicity
                    room_code: this.roomCode,
                    host_user_id: this.playerId,
                    host_id: this.playerId,
                    game_id: 'space-card-game',
                    max_players: 2,
                    current_players: 1,
                    game_state: { status: 'waiting' },
                    is_active: true,
                    status: 'waiting'
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating room:', error);
                return { success: false, error: error.message };
            }

            this.roomId = room.id;

            // Subscribe to room updates
            await this._subscribeToRoom();

            console.log('Room created:', this.roomCode);
            return { success: true, roomCode: this.roomCode };
        } catch (error) {
            console.error('Error creating room:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Join an existing game room
     * @param {string} code - Room code to join
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async joinRoom(code) {
        try {
            this.roomCode = code.toUpperCase();
            this.isPlayer1 = false;  // Joining player is P2

            // Find the room
            const { data: room, error: findError } = await this.supabase
                .from('game_rooms')
                .select('*')
                .eq('room_code', this.roomCode)
                .eq('is_active', true)
                .single();

            if (findError || !room) {
                return { success: false, error: 'Room not found' };
            }

            if (room.current_players >= 2) {
                return { success: false, error: 'Room is full' };
            }

            this.roomId = room.id;
            this.opponentId = room.host_user_id;

            // Update room with player 2
            const { error: updateError } = await this.supabase
                .from('game_rooms')
                .update({
                    guest_id: this.playerId,
                    current_players: 2,
                    game_state: { status: 'playing' },
                    status: 'playing'
                })
                .eq('id', this.roomId);

            if (updateError) {
                return { success: false, error: 'Failed to join room' };
            }

            // Subscribe to room updates
            await this._subscribeToRoom();

            // Notify host that we joined
            await this.sendAction('player_joined', { playerId: this.playerId });

            console.log('Joined room:', this.roomCode);
            return { success: true };
        } catch (error) {
            console.error('Error joining room:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Subscribe to real-time room updates
     */
    async _subscribeToRoom() {
        this.channel = this.supabase
            .channel(`room:${this.roomCode}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'game_state_updates',
                    filter: `room_id=eq.${this.roomId}`
                },
                (payload) => {
                    try {
                        // Ignore our own actions
                        if (payload.new.user_id === this.playerId) return;

                        console.log('Received action:', payload.new);
                        const { event_type, event_data } = payload.new;

                        if (event_type === 'player_joined' && this.onPlayerJoined) {
                            this.opponentId = event_data.playerId;
                            this.onPlayerJoined(event_data);
                        } else if (event_type === 'player_left' && this.onPlayerLeft) {
                            this.onPlayerLeft(event_data);
                        } else if (this.onGameAction) {
                            this.onGameAction(event_type, event_data);
                        }
                    } catch (error) {
                        console.error('ERROR in subscription handler:', error);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_rooms',
                    filter: `id=eq.${this.roomId}`
                },
                (payload) => {
                    // Room updated - check if player joined
                    if (payload.new.guest_id && !payload.old.guest_id) {
                        this.opponentId = payload.new.guest_id;
                        if (this.onPlayerJoined) {
                            this.onPlayerJoined({ playerId: payload.new.guest_id });
                        }
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('Subscription status:', status, err || '');
                this.isConnected = status === 'SUBSCRIBED';

                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('Realtime subscription error:', err);
                    // Attempt to reconnect after a delay
                    setTimeout(() => {
                        if (!this.isConnected && this.roomCode) {
                            console.log('Attempting to reconnect...');
                            this._subscribeToRoom();
                        }
                    }, 3000);
                }
            });
    }

    /**
     * Send a game action to the opponent
     * @param {string} actionType - Type of action (e.g., 'play_card', 'end_turn')
     * @param {object} actionData - Action data
     */
    async sendAction(actionType, actionData) {
        if (!this.roomId) {
            console.error('Not in a room');
            return { success: false, error: 'Not in a room' };
        }

        console.log('Sending action:', actionType, actionData);

        const { data, error } = await this.supabase
            .from('game_state_updates')
            .insert({
                room_id: this.roomId,
                user_id: this.playerId,
                event_type: actionType,
                event_data: actionData
            })
            .select();

        if (error) {
            console.error('Error sending action:', error);
            if (this.onError) this.onError(error);
            return { success: false, error };
        }

        console.log('Action sent successfully:', data);
        return { success: true, data };
    }

    /**
     * Leave the current room
     */
    async leaveRoom() {
        if (this.channel) {
            await this.supabase.removeChannel(this.channel);
            this.channel = null;
        }

        if (this.roomId) {
            // Notify opponent
            await this.sendAction('player_left', { playerId: this.playerId });

            // Update room
            if (this.isPlayer1) {
                // Host leaving - close room
                await this.supabase
                    .from('game_rooms')
                    .update({ is_active: false, status: 'closed' })
                    .eq('id', this.roomId);
            } else {
                // Guest leaving - update player count
                await this.supabase
                    .from('game_rooms')
                    .update({
                        guest_id: null,
                        current_players: 1,
                        game_state: { status: 'waiting' },
                        status: 'waiting'
                    })
                    .eq('id', this.roomId);
            }
        }

        this.roomId = null;
        this.roomCode = null;
        this.opponentId = null;
        this.isConnected = false;
    }

    /**
     * Check if it's the local player's turn
     * @param {boolean} isPlayer1Turn - Current turn from game state
     * @returns {boolean}
     */
    isMyTurn(isPlayer1Turn) {
        return this.isPlayer1 === isPlayer1Turn;
    }
}
