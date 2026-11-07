import { availableActionsText } from './capabilityRegistry';
export const views = {
    home: 'Home', wallet: 'Your Devnet wallet', contacts: 'Saved contacts',
    transfer: 'Send SOL', activity: 'Recent activity', learn: 'Explore Web3', settings: 'Settings',
} as const;
export type View = keyof typeof views;
export const capabilities = [
    { id: 'where_am_i', label: 'Where am I?' },
    { id: 'what_can_i_do', label: 'What can I do?' },
    { id: 'go_back', label: 'Go back' },
    { id: 'repeat', label: 'Repeat' },
] as const;
export type Command = typeof capabilities[number]['id'];
export type State = {
    view: View;
    history: View[];
    announcement: string;
    revision: number;
};
export const initialState: State = { view: 'home', history: [], announcement: 'You are on Home. No pending action.', revision: 0 };
export type Action = {
    type: 'navigate';
    view: View;
} | {
    type: 'command';
    command: Command;
} | {
    type: 'unknown';
};
export function location(view: View): string {
    return `You are on ${views[view]}. No pending action.`;
}
export function reducer(state: State, action: Action): State {
    const next = { ...state, revision: state.revision + 1 };
    if (action.type === 'navigate') {
        if (state.view === action.view)
            return { ...next, announcement: location(state.view) };
        return { ...next, view: action.view, history: [...state.history, state.view], announcement: location(action.view) };
    }
    if (action.type === 'unknown')
        return { ...next, announcement: 'Request not recognized. Try “Where am I?”, “What can I do?”, “Send 0.1 SOL to Mum”, or choose an action below.' };
    switch (action.command) {
        case 'where_am_i': return { ...next, announcement: location(state.view) };
        case 'what_can_i_do': return { ...next, announcement: availableActionsText() };
        case 'repeat': return next;
        case 'go_back': {
            const view = state.history.at(-1);
            return view ? { ...next, view, history: state.history.slice(0, -1), announcement: location(view) } : { ...next, announcement: 'You are on Home. There is no previous page. No pending action.' };
        }
    }
}
export function parseRequest(input: string): Action {
    const text = input.trim().toLowerCase().replace(/[?.!]+$/g, '').replace(/\s+/g, ' ');
    const commands: Record<string, Command> = { 'where am i': 'where_am_i', 'what can i do': 'what_can_i_do', 'go back': 'go_back', back: 'go_back', repeat: 'repeat' };
    if (Object.hasOwn(commands, text))
        return { type: 'command', command: commands[text] };
    const pages: Record<string, View> = { home: 'home', wallet: 'wallet', 'check balance': 'wallet', contacts: 'contacts', 'saved contacts': 'contacts', 'send sol': 'transfer', 'recent activity': 'activity', activity: 'activity', 'explore web3': 'learn', settings: 'settings' };
    return Object.hasOwn(pages, text) ? { type: 'navigate', view: pages[text] } : { type: 'unknown' };
}
