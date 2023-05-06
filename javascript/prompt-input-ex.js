onUiLoaded(() => {

  const promptInputAreaEx = new PromptInputAreaEx()
  promptInputAreaEx.init();
})

// Expand the prompt input fields because I don't like the low usability of the prompt input fields.
class PromptInputAreaEx {
  static PROMPT_ID = "txt2img_prompt";
  static NEG_ID = "txt2img_neg_prompt";

  constructor() {
    this.selEmph = { isNeg: false, prompt: "" };
  }

  static promptArea() {
    return gradioApp()
      .getElementById(PromptInputAreaEx.PROMPT_ID)
      .querySelector("textarea");
  }

  static negArea() {
    return gradioApp()
      .getElementById(PromptInputAreaEx.NEG_ID)
      .querySelector("textarea");
  }

  static targetTextArea(toNegative = false) {
    return toNegative
      ? PromptInputAreaEx.negArea()
      : PromptInputAreaEx.promptArea();
  }

  init() {
    const script = document.createElement(`script`);
    script.src = `/file=extensions/sdweb-prompt-input-ex/javascript/jquery.highlight-within-textarea.js`;
    document.head.appendChild(script);

    const link = document.createElement(`link`);
    link.rel = "stylesheet";
    link.href = `/file=extensions/sdweb-prompt-input-ex/css/jquery.highlight-within-textarea.css`;
    document.head.appendChild(link);

    const areas = [
      [PromptInputAreaEx.promptArea(), PromptInputAreaEx.PROMPT_ID],
      [PromptInputAreaEx.negArea(), PromptInputAreaEx.NEG_ID],
    ];

    areas.forEach(([textarea, id]) => {
      textarea.addEventListener("blur", (e) => {
        onBlur(e, id);
      });

      textarea.addEventListener("mousedown", (e) => {
        onMouseDown(e, id);
      });

      textarea.addEventListener("dblclick", (e) => {
        onDblCilck(e.target, e.target.selectionStart, false);
      });

      textarea.addEventListener("keydown", (e) => {
        onKeyDown(e);
      });

      const provider = new TextAreaUndoRedoProvier(textarea);
      provider.init();

      const onBlur = (e, id) => {
        // Retains cursor display after focus is lost
        const target = e.target;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        if (start !== end) {
          if (e.relatedTarget !== null) {
            $(`#${id} textarea`).highlightWithinTextarea({
              highlight: [start, end],
              className: "hwt-selected-area",
            });
          }
        }
      };

      const onMouseDown = (e, id) => {
        if (e.detail > 1) {
          e.preventDefault();
        } else {
          // Clear the cursor position left last time
          const target = e.target;
          $(`#${id} textarea`).highlightWithinTextarea({
            highlight: [0, target.value.length],
            className: "hwt-un-selected-area",
          });

          if (target === PromptInputAreaEx.promptArea()) {
            this.selEmphPrompt = false;
          } else if (target === PromptInputAreaEx.negArea()) {
            this.selEmphNeg = false;
          }
        }
      };

      const onDblCilck = (target, selectionStart, emphOnly) => {
        // Extend the selection with comma-separated units as words
        const text = target.value;
        const start = selectionStart;
        const lastIndex = text.lastIndexOf(",", start - 1);
        const startIndex = lastIndex === -1 ? 0 : lastIndex + 1;
        const nextIndex = text.indexOf(",", start);
        const endIndex = (nextIndex === -1 ? text.length - 1 : nextIndex) + 1;

        if (
          text
            .slice(startIndex, endIndex)
            .trim()
            .match(/\(.*:.*\)/) === null
        ) {
          target.setSelectionRange(startIndex, endIndex);
          return;
        }

        // Special actions in the range enclosed by parentheses
        const isNeg = target === PromptInputAreaEx.negArea();
        const emphIndex = text.lastIndexOf(":", endIndex - 1);
        const emphEndIndex = emphIndex === -1 ? endIndex : emphIndex;
        const slicedText = text.slice(startIndex + 1, emphEndIndex);

        // Double-clicking on the numerical part.
        const eParenthesesIndex = text.indexOf(")", emphEndIndex);
        if (
          emphOnly === false &&
          start > emphIndex &&
          eParenthesesIndex >= start
        ) {
          target.setSelectionRange(emphIndex + 1, eParenthesesIndex);
          // Select the entire word, including parentheses
        } else if (
          emphOnly === false &&
          this.selEmph.prompt.length > 0 &&
          slicedText === this.selEmph.prompt &&
          isNeg === this.selEmph.isNeg
        ) {
          target.setSelectionRange(startIndex, endIndex);
          this.selEmph.prompt = "";
          this.selEmph.isNeg = isNeg;
          // Select words to be emphasized
        } else {
          const sParenthesesIndex = text.indexOf("(", startIndex);
          target.setSelectionRange(sParenthesesIndex + 1, emphEndIndex);
          this.selEmph.prompt = slicedText;
          this.selEmph.isNeg = isNeg;
        }
      };

      const onKeyDown = (e) => {
        if (e.ctrlKey) {
          if (e.code == `ArrowUp` || e.code == `ArrowBottom`) {
            // Adjustments for standard highlighting functions
            const target = e.target;
            const text = target.value;
            const start = target.selectionStart;
            const end = target.selectionEnd;

            if (text.length > 1 && text[end - 1] === ",") {
              target.setSelectionRange(start, end - 1);
            }
          } else if (e.code == `ArrowLeft` || e.code == `ArrowRight`) {
            // Swap Words
            e.preventDefault();
            const target = e.target;
            const text = target.value;
            const start = target.selectionStart;
            const prompts = text
              .split(",")
              .map((value, index) => ({ id: index, value: value }));
            const cursorIndex = text.slice(0, start).split(",").length - 1;
            const swapOffset = e.code == `ArrowLeft` ? -1 : 1;

            var from, to;
            // When you reach the left end, go to the right end
            if (0 > swapOffset && 0 >= cursorIndex) {
              (from = 0), (to = prompts.length - 1);
              // When you reach the right end, go to the left end
            } else if (swapOffset > 0 && cursorIndex >= prompts.length - 1) {
              (from = prompts.length - 1), (to = 0);
            } else {
              (from = cursorIndex), (to = cursorIndex + swapOffset);
            }

            // Swap
            const temp = prompts[from];
            prompts[from] = prompts[to];
            prompts[to] = temp;

            const newValue = prompts
              .map(({ id, value }) => value)
              .join(",");
            target.value = newValue;

            // Decide the starting position of the cursor
            const findIndex = prompts.findIndex(
              ({ id, value }) => id === prompts[to].id
            );
            const startIndex = newValue
              .split(",")
              .slice(0, findIndex)
              .reduce((acc, value) => acc + value.length + 1, 0);
            onDblCilck(target, startIndex, true);
            updateInput(target);
          }
        }
      };
    });
  }
}

// Input details
class InputData {
  constructor(value, selectionStart, selectionEnd, undo) {
    this.value = value;
    this.selectionStart = selectionStart;
    this.selectionEnd = selectionEnd;
    this.undo = undo;
  }
}

//Back up all data, albeit in a foolproof manner. I am not writing a novel,
// so there is no need to dress it up and take it in differentials.
class TextAreaUndoRedoProvier {
  constructor(textarea) {
    this.textarea = textarea;
    this.undoStack = [];
    this.redoStack = [];
    this.initialValue = "";
  }

  init() {
    this.initialValue = this.textarea.value;
    this.textarea.addEventListener("keydown", (e) => {
      if (!e.ctrlKey) {
        return;
      }

      if (e.key === "z") {
        if (!e.shiftKey) {
          undo();
        } else {
          redo();
        }
        e.preventDefault();
      } else if (e.key === "y") {
        redo();
        e.preventDefault();
      }
    });

    const undo = () => {
      if (this.undoStack.length === 0) {
        return;
      }
      const popData = this.undoStack.pop();
      this.redoStack.push(
        new InputData(
          popData.value,
          popData.selectionStart,
          popData.selectionEnd,
          popData
        )
      );
      if (this.undoStack.length === 0) {
        this.textarea.value = this.initialValue;
        return;
      }
      const data = this.undoStack.slice(-1)[0];
      this.textarea.value = data.value;
      this.textarea.setSelectionRange(data.selectionStart, data.selectionEnd);
    };

    const redo = () => {
      if (this.redoStack.length === 0) {
        return;
      }
      const data = this.redoStack.pop();
      this.textarea.value = data.value;
      this.textarea.setSelectionRange(data.selectionStart, data.selectionEnd);
      this.undoStack.push(data.undo);
    };

    this.textarea.addEventListener("input", (e) => {
      this.undoStack.push(
        new InputData(
          this.textarea.value,
          this.textarea.selectionStart,
          this.textarea.selectionEnd,
          null
        )
      );
    });

    this.textarea.addEventListener("select", (e) => {
      if (this.undoStack.length === 0) {
        return;
      }

      const data = this.undoStack.slice(-1)[0];
      data.selectionStart = e.target.selectionStart;
      data.selectionEnd = e.target.selectionEnd;
    });
  }
}