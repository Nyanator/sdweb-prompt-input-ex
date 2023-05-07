onUiLoaded(() => {
  const txt2imgPromptInputAreaEx = new PromptInputAreaEx("txt2img");
  txt2imgPromptInputAreaEx.init();

  const img2imgPromptInputAreaEx = new PromptInputAreaEx("img2img");
  img2imgPromptInputAreaEx.init();
});

// Expand the prompt input fields because I don't like the low usability of the prompt input fields.
class PromptInputAreaEx {
  PHRASE_SEP = ","; 
  START_BRACKETS = ["(", "["];
  END_BRACKETS = [")", "]"];
  EMP_MARK = ":";

  constructor(prefix) {
    this.PROMPT_ID = `${prefix}_prompt`;
    this.NEG_ID = `${prefix}_neg_prompt`;
  }

  promptArea() {
    return gradioApp().getElementById(this.PROMPT_ID).querySelector("textarea");
  }

  negArea() {
    return gradioApp().getElementById(this.NEG_ID).querySelector("textarea");
  }

  targetTextArea(toNegative = false) {
    return toNegative ? this.negArea() : this.promptArea();
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
      [this.promptArea(), this.PROMPT_ID],
      [this.negArea(), this.NEG_ID],
    ];

    areas.forEach(([textarea, id]) => {
      textarea.addEventListener("mousedown", (e) => {
        if (!(e.ctrlKey || e.metaKey)) {
          if (e.detail > 1) {
            e.preventDefault();
            return;
          }
        }
      });

      textarea.addEventListener("dblclick", (e) => {
        if (e.ctrlKey || e.metaKey) {
          return;
        }
        e.preventDefault();
        onDblCilck(e.target, e.target.selectionStart);
      });

      textarea.addEventListener("keydown", (e) => {
        onKeyDown(e);
      });

      const provider = new TextAreaUndoRedoProvier(textarea);
      provider.init();

      const onDblCilck = (target, selectionStart, isShiftSpace = false) => {
        // Extend the selection with comma-separated units as phrase
        const text = target.value;
        const start = selectionStart;

        // Calculate the start and end position of a phrase from the selected position
        const seaarcPhrasePosition = (text, selectionStart, end)=> {
          let normalisedString = text;
          const brackets = this.START_BRACKETS.map(((value, index) => [value, this.END_BRACKETS[index]]));
          for (const bracket of brackets) {
            const sBracket = `\\${bracket[0]}`;
            const eBracket = `\\${bracket[1]}`;
            const regex = new RegExp(sBracket + '[^' + eBracket + ']*' + eBracket, 'g');
            normalisedString = normalisedString.replace(regex, (match) => " ".repeat(match.length));
          }

          if (end) {
            let result = normalisedString.indexOf(this.PHRASE_SEP, selectionStart);
            if (result !== -1 && text[result] === this.PHRASE_SEP) {
              result++;
            }
            return result === -1 ? text.length : result;
          } else {
            if (selectionStart === 0) {
              return 0;
            }
            const result = normalisedString.lastIndexOf(this.PHRASE_SEP, selectionStart - 1);
            return result + 1;
          }
        }

        // Calculate the position of the nearest symbol from the selected position
        const nearestIndexOf = (str, isLast, position, ...searchStrings) => {
          const indexes = [];
          for (const searchString of searchStrings) {
            indexes.push(
              isLast
                ? str.lastIndexOf(searchString, position)
                : str.indexOf(searchString, position)
            );
          }
          const filterdIndexes = indexes.filter((index) => index !== -1);
          return isLast
            ? Math.max(...filterdIndexes)
            : Math.min(...filterdIndexes);
        }

        // Check selection position
        if (isShiftSpace === false) {
          const phraseStart = seaarcPhrasePosition(text, start, false);
          const phraseEnd = seaarcPhrasePosition(text, start, true);
          const startBracketsIndex = nearestIndexOf(text, false, phraseStart, ...this.START_BRACKETS);
          const endBracketsIndex = nearestIndexOf(text, true, phraseEnd, ...this.END_BRACKETS);
        
          // Select the entire phrase when outside the parentheses are selected
          if (startBracketsIndex >= start || start > endBracketsIndex) {
            target.setSelectionRange(phraseStart, phraseEnd);
            return;
          }
        }

        // The nearest delimiter is used as the start position.
        const startWords = [this.EMP_MARK, this.PHRASE_SEP];
        startWords.push(...this.START_BRACKETS);
        if (isShiftSpace) {
          startWords.push(" ");
        }
        let wordStartIndex = nearestIndexOf(text, true, start - 1, ...startWords);
        if (wordStartIndex === -Infinity) {
          wordStartIndex = 0;
        }
        // Correct the start of the selection position until it is no longer a delimiter
        if (startWords.includes(text[wordStartIndex])) {
          const offset = Array.from(text.slice(wordStartIndex)).findIndex(
            (char) => startWords.includes(char) === false
          );
          if (offset !== -1) {
            wordStartIndex += offset;
          }
        }

        // The nearest delimiter is the end position.
        const endWords = [this.PHRASE_SEP, this.EMP_MARK];
        endWords.push(...this.END_BRACKETS);
        if (isShiftSpace) {
          endWords.push(" ");
        }
        let wordEndIndex = nearestIndexOf(text, false, start, ...endWords);
        if (wordEndIndex === Infinity) {
          wordEndIndex = text.length;
        }
        if (text[wordEndIndex] === this.PHRASE_SEP) {
          wordEndIndex++;
        }
        target.setSelectionRange(wordStartIndex, wordEndIndex);
      };

      const onKeyDown = (e) => {
        if (!(e.ctrlKey || e.metaKey)) {
          return;
        }

        if (e.key === `ArrowUp` || e.key === `ArrowBottom`) {
          // Adjustments for standard highlighting functions
          e.preventDefault();
          const target = e.target;
          const text = target.value;
          const start = target.selectionStart;
          const end = target.selectionEnd;

          if (text.length > 1 && text[end - 1] === this.PHRASE_SEP) {
            target.setSelectionRange(start, end - 1);
          }
        } else if (e.key === `ArrowLeft` || e.key === `ArrowRight`) {
          // Swap Words
          const isShiftSpace = e.shiftKey;
          const delimiter = !isShiftSpace ? this.PHRASE_SEP : " ";
          e.preventDefault();
          const target = e.target;
          const text = target.value;
          const start = target.selectionStart;
          const prompts = text
            .split(delimiter)
            .map((value, index) => ({ id: index, value: value }));
          const cursorIndex = text.slice(0, start).split(delimiter).length - 1;
          const swapOffset = e.key === `ArrowLeft` ? -1 : 1;

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
            .join(delimiter);
          target.value = newValue;

          // Decide the starting position of the cursor
          const findIndex = prompts.findIndex(
            ({ id, value }) => id === prompts[to].id
          );
          let startIndex = newValue
            .split(delimiter)
            .slice(0, findIndex)
            .reduce((acc, value) => acc + value.length + 1, 0);
          
          if (isShiftSpace === false) {
            const nextBracket = Array.from(newValue.slice(startIndex)).findIndex((char) => this.START_BRACKETS.includes(char));
            const nextSeparater = Array.from(newValue.slice(startIndex)).findIndex((char) => this.PHRASE_SEP.includes(char));
            if (nextBracket !== -1 && (nextSeparater > nextBracket || nextSeparater === -1)) {
              startIndex += nextBracket + 1;
            }
          }
          onDblCilck(target, startIndex, isShiftSpace);
          updateInput(target);
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
    this.myInput = false;
  }

  init() {
    this.initialValue = this.textarea.value;
    this.textarea.addEventListener("keydown", (e) => {
      if (!(e.ctrlKey || e.metaKey)) {
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

    this.textarea.addEventListener("input", (e) => {
      if (this.myInput) {
        this.myInput = false;
        return;
      }
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
