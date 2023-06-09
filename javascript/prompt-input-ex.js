class PromptInputAreaEx {
    constructor(prefix, gradioApp) {
        this.gradioApp = gradioApp;
        this.PROMPT_ID = `${prefix}_prompt`;
        this.NEGATIVE_ID = `${prefix}_neg_prompt`;
        this.promptParser = new PromptParser("");
        this.shiftKind = "";
    }
    promptArea() {
        return this.gradioApp
            .getElementById(this.PROMPT_ID)
            .querySelector("textarea");
    }
    negativeArea() {
        return this.gradioApp
            .getElementById(this.NEGATIVE_ID)
            .querySelector("textarea");
    }
    targetTextArea(toNegative = false) {
        return toNegative ? this.negativeArea() : this.promptArea();
    }
    init() {
        const areas = [this.promptArea(), this.negativeArea()];
        areas.forEach((textarea) => {
            textarea.addEventListener("mousedown", (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.detail > 1) {
                        e.preventDefault();
                        return;
                    }
                }
            });
            textarea.addEventListener("dblclick", (e) => {
                if (!(e.ctrlKey || e.metaKey)) {
                    this.shiftKind = PromptParser.SHIFT_CHUNKS;
                    return;
                }
                e.preventDefault();
                if (!e.altKey) {
                    this.shiftKind = PromptParser.SHIFT_FIELDS;
                    this.expandSelectionToField(e);
                }
                else {
                    this.shiftKind = PromptParser.SHIFT_PHRASES;
                    this.expandSelectionToPhrase(e);
                }
            });
            textarea.addEventListener("keydown", (e) => {
                if (!(e.ctrlKey || e.metaKey)) {
                    return;
                }
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    this.adjustSelection(e);
                    return;
                }
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    e.preventDefault();
                    this.shiftChunks(e);
                    return;
                }
                if (e.key === "Delete") {
                    e.preventDefault();
                    this.deleteEmphasis(e);
                    return;
                }
                if (e.key === "/") {
                    e.preventDefault();
                    this.cleanUpPrompt(e);
                    return;
                }
            });
        });
    }
    expandSelectionToField(e) {
        const target = e.target;
        this.promptParser.parse(target.value);
        const selectionStart = PromptInputAreaEx.adjustSelectionStart(target.value, target.selectionStart);
        const selectedField = this.promptParser.getSelectedField(selectionStart);
        target.setSelectionRange(selectedField.start, selectedField.end);
    }
    expandSelectionToPhrase(e) {
        const target = e.target;
        this.promptParser.parse(target.value);
        const selectionStart = PromptInputAreaEx.adjustSelectionStart(target.value, target.selectionStart);
        const selectedPhrase = this.promptParser.getSelectedPhrase(selectionStart);
        target.setSelectionRange(selectedPhrase.start, selectedPhrase.end);
    }
    adjustSelection(e) {
        const target = e.target;
        const ajustedSelection = PromptInputAreaEx.adjustSelection(target.value, target.selectionStart, target.selectionEnd);
        target.setSelectionRange(ajustedSelection.start, ajustedSelection.end);
    }
    shiftChunks(e) {
        if (this.shiftKind.trim() === "") {
            return;
        }
        const target = e.target;
        this.promptParser.parse(target.value);
        const shiftDirection = e.key === "ArrowLeft"
            ? TextSplitter.SHIFT_LEFT
            : TextSplitter.SHIFT_RIGHT;
        const result = this.promptParser.generateShiftedChunks(target.selectionStart, 1, shiftDirection, this.shiftKind);
        this.updateTextarea(target, result.newChunks.map((chunk) => chunk.text).join(""), result.movedChunk.start, result.movedChunk.end, true);
    }
    deleteEmphasis(e) {
        const target = e.target;
        this.promptParser.parse(target.value);
        const result = this.promptParser.generateRemovedEmphasisChunks(target.selectionStart);
        if (result.remainedChunk === null) {
            return;
        }
        const newValue = result.newChunks.map((chunk) => chunk.text).join("");
        this.updateTextarea(target, newValue, result.remainedChunk.start, result.remainedChunk.end);
    }
    cleanUpPrompt(e) {
        const target = e.target;
        this.promptParser.parse(target.value);
        const cleanedText = this.promptParser.cleanPrompt();
        this.updateTextarea(target, cleanedText, 0, cleanedText.length);
    }
    updateTextarea(target, value, selectionStart, selectionEnd, forceUpdate = false) {
        if (value === target.value && forceUpdate === false) {
            return;
        }
        target.value = value;
        if (selectionStart !== -1 && selectionEnd !== -1) {
            target.setSelectionRange(selectionStart, selectionEnd);
        }
        updateInput(target);
    }
    static adjustSelectionStart(prompt, selectionStart) {
        while (PromptInputAreaEx.SELIGN_CHAR.includes(prompt[selectionStart])) {
            selectionStart++;
        }
        return Math.max(0, selectionStart);
    }
    static adjustSelection(prompt, selectionStart, selectionEnd) {
        const start = PromptInputAreaEx.adjustSelectionStart(prompt, selectionStart);
        let end = selectionEnd;
        while (PromptInputAreaEx.SELIGN_CHAR.includes(prompt[end - 1])) {
            if (prompt[end - 1] === PromptParser.EMPHA_BRACKETS[1]) {
                const markIndex = prompt.lastIndexOf(PromptParser.EMPHA_MARK, end);
                const perhapsNumPart = prompt.slice(markIndex + 1, end - 1).trim();
                if (TextSplitter.checkNumeric(perhapsNumPart)) {
                    end = markIndex;
                    break;
                }
            }
            end--;
        }
        return { start: Math.max(0, start), end: Math.min(end, prompt.length) };
    }
}
PromptInputAreaEx.SELIGN_CHAR = PromptParser.CHUNK_SEP;
onUiLoaded(() => {
    const txt2imgPromptInputAreaEx = new PromptInputAreaEx("txt2img", gradioApp());
    txt2imgPromptInputAreaEx.init();
    const txt2imgPromptProvider = new TextAreaUndoRedoProvider(txt2imgPromptInputAreaEx.promptArea());
    txt2imgPromptProvider.init();
    const txt2imgNegativeProvider = new TextAreaUndoRedoProvider(txt2imgPromptInputAreaEx.negativeArea());
    txt2imgNegativeProvider.init();
    const img2imgPromptInputAreaEx = new PromptInputAreaEx("img2img", gradioApp());
    img2imgPromptInputAreaEx.init();
    const img2imgPromptProvider = new TextAreaUndoRedoProvider(img2imgPromptInputAreaEx.promptArea());
    img2imgPromptProvider.init();
    const img2imgNegativeProvider = new TextAreaUndoRedoProvider(img2imgPromptInputAreaEx.negativeArea());
    img2imgNegativeProvider.init();
});
