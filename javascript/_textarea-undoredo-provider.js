class TextAreaUndoRedoProvider {
    constructor(textarea) {
        this.textarea = textarea;
        this.undoStack = [];
        this.redoStack = [];
        this.initialValue = "";
        this.myInput = false;
    }
    init() {
        this.initialValue = this.textarea.value;
        this.textarea.addEventListener("keydown", (e) => {
            if (!(e.ctrlKey || e.metaKey)) {
                return;
            }
            if (e.key === "z") {
                !e.shiftKey ? undo() : redo();
                e.preventDefault();
            }
            else if (e.key === "y") {
                redo();
                e.preventDefault();
            }
        });
        const undo = () => {
            if (this.undoStack.length === 0) {
                return;
            }
            const popData = this.undoStack.pop();
            this.redoStack.push(new InputData(popData.value, popData.selectionStart, popData.selectionEnd, popData));
            if (this.undoStack.length === 0) {
                this.textarea.value = this.initialValue;
                return;
            }
            this.myInput = true;
            const data = this.undoStack.slice(-1)[0];
            this.textarea.value = data.value;
            this.textarea.setSelectionRange(data.selectionStart, data.selectionEnd);
            updateInput(this.textarea);
        };
        const redo = () => {
            if (this.redoStack.length === 0) {
                return;
            }
            this.myInput = true;
            const data = this.redoStack.pop();
            this.textarea.value = data.value;
            this.textarea.setSelectionRange(data.selectionStart, data.selectionEnd);
            this.undoStack.push(data.undo);
            updateInput(this.textarea);
        };
        this.textarea.addEventListener("input", () => {
            if (this.myInput) {
                this.myInput = false;
                return;
            }
            this.undoStack.push(new InputData(this.textarea.value, this.textarea.selectionStart, this.textarea.selectionEnd, null));
        });
        this.textarea.addEventListener("select", (e) => {
            if (this.undoStack.length === 0) {
                return;
            }
            const target = e.target;
            const data = this.undoStack.slice(-1)[0];
            data.selectionStart = target.selectionStart;
            data.selectionEnd = target.selectionEnd;
        });
    }
}
class InputData {
    constructor(value, selectionStart, selectionEnd, undo) {
        this.value = value;
        this.selectionStart = selectionStart;
        this.selectionEnd = selectionEnd;
        this.undo = undo;
    }
}
