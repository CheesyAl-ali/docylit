export interface DocumentState {
    content: string;
    title: string;
    lastSaved: Date;
}

export enum EditorActionType {
    BOLD = 'bold',
    ITALIC = 'italic',
    UNDERLINE = 'underline',
    JUSTIFY_LEFT = 'justifyLeft',
    JUSTIFY_CENTER = 'justifyCenter',
    JUSTIFY_RIGHT = 'justifyRight',
    INSERT_ORDERED_LIST = 'insertOrderedList',
    INSERT_UNORDERED_LIST = 'insertUnorderedList',
    UNDO = 'undo',
    REDO = 'redo'
}

export interface AIRequest {
    prompt: string;
    context: string;
    type: 'continue' | 'summarize' | 'refine' | 'custom';
}
