class PromptParser {
    constructor(prompt) {
        this.prompt = prompt;
    }
    parse(prompt) {
        this.prompt = prompt;
        this.chunks = this.generateChunks();
        this.fields = this.generateFields();
        this.phrases = this.generatePhrases();
    }
    generateChunks() {
        return TextSplitter.generateChunksWithSeparators(this.prompt, PromptParser.CHUNK_SEP);
    }
    generateFields() {
        const fields = TextSplitter.generateChunksWithSeparators(this.prompt, PromptParser.CHUNK_SEP.filter((sep) => sep.trim() !== "" && sep !== PromptParser.EMPHA_MARK));
        return fields;
    }
    generatePhrases() {
        const findPhraseEndIndex = (str, startIndex) => {
            let stack = 0;
            for (let i = startIndex; i < str.length; i++) {
                const char = str.charAt(i);
                if (char === PromptParser.EMPHA_BRACKETS[0]) {
                    stack++;
                }
                else if (char === PromptParser.EMPHA_BRACKETS[1]) {
                    stack--;
                }
                else if (char === PromptParser.PHRASE_SEP && stack === 0) {
                    return i;
                }
            }
            return str.length;
        };
        const splitIntoPhrases = (str, startIndex) => {
            if (startIndex >= str.length) {
                return [];
            }
            const endIndex = findPhraseEndIndex(str, startIndex);
            const phrase = str.slice(startIndex, endIndex);
            const remainingPhrases = splitIntoPhrases(str, endIndex + 1);
            if (str[endIndex] === PromptParser.PHRASE_SEP) {
                return [phrase, PromptParser.PHRASE_SEP, ...remainingPhrases];
            }
            return [phrase, ...remainingPhrases];
        };
        const phrases = splitIntoPhrases(this.prompt, 0);
        return TextSplitter.textChunksToObjectChunks(phrases);
    }
    generateRemovedEmphasisChunks(originalIndex) {
        const chunkIndex = TextSplitter.getChunkIndexFromOriginalIndex(this.chunks, originalIndex);
        const bracketsIndex = TextSplitter.getBracketsIndexFromChunks(this.chunks, chunkIndex, PromptParser.EMPHA_BRACKETS[0], PromptParser.EMPHA_BRACKETS[1]);
        if (bracketsIndex.start !== -1 && bracketsIndex.end !== -1) {
            const innerBrackets = this.chunks
                .slice(bracketsIndex.start + 1, bracketsIndex.end)
                .map((chunk) => chunk.text)
                .join("");
            let removed = innerBrackets;
            const markIndex = innerBrackets.lastIndexOf(PromptParser.EMPHA_MARK);
            const perhapsNumPart = innerBrackets
                .slice(markIndex + 1, innerBrackets.length)
                .trim();
            if (TextSplitter.checkNumeric(perhapsNumPart)) {
                removed = innerBrackets.slice(0, markIndex);
            }
            const remainedChunk = new Chunk(removed, 0);
            const newChunks = [
                ...this.chunks.slice(0, bracketsIndex.start),
                remainedChunk,
                ...this.chunks.slice(bracketsIndex.end + 1),
            ];
            Chunk.recalcChunks(newChunks);
            return { remainedChunk, newChunks };
        }
        return { remainedChunk: null, newChunks: this.chunks };
    }
    generateShiftedChunks(originalIndex, shiftAmount, direction, shiftKind) {
        let chunks = null;
        if (shiftKind === PromptParser.SHIFT_CHUNKS) {
            chunks = this.chunks;
        }
        else if (shiftKind === PromptParser.SHIFT_FIELDS) {
            chunks = this.fields;
        }
        else if (shiftKind == PromptParser.SHIFT_PHRASES) {
            chunks = this.phrases;
        }
        const chunkIndex = TextSplitter.getChunkIndexFromOriginalIndex(chunks, originalIndex);
        return TextSplitter.generateShiftedChunks(chunks, chunkIndex, shiftAmount, direction, PromptParser.CHUNK_SEP);
    }
    getSelectedChunk(originalIndex) {
        const chunkIndex = TextSplitter.getChunkIndexFromOriginalIndex(this.chunks, originalIndex);
        return this.chunks[chunkIndex];
    }
    getSelectedField(originalIndex) {
        const chunkIndex = TextSplitter.getChunkIndexFromOriginalIndex(this.fields, originalIndex);
        return this.fields[chunkIndex];
    }
    getSelectedPhrase(originalIndex) {
        const chunkIndex = TextSplitter.getChunkIndexFromOriginalIndex(this.phrases, originalIndex);
        return this.phrases[chunkIndex];
    }
    cleanPrompt() {
        let cleanedPrompt = this.prompt
            .replace(/\t/g, "    ")
            .replace(/\u3000/g, " ")
            .replace(/\r/g, "")
            .replace(new RegExp(`^([\\s${TextSplitter.escRe(PromptParser.PHRASE_SEP)}]+)|([\\s${TextSplitter.escRe(PromptParser.PHRASE_SEP)}]+)$`, "g"), "")
            .trim();
        const phrases = Array.from(cleanedPrompt);
        let separator = "";
        cleanedPrompt = phrases.reduce((acc, char) => {
            if (char === PromptParser.PHRASE_SEP || char === PromptParser.WORD_SEP) {
                if (separator === "") {
                    separator = char;
                    if (separator === PromptParser.PHRASE_SEP) {
                        separator += " ";
                    }
                }
            }
            else {
                if (separator !== "") {
                    acc += separator;
                    separator = "";
                }
                acc += char;
            }
            return acc;
        }, "");
        return cleanedPrompt;
    }
}
PromptParser.PHRASE_SEP = ",";
PromptParser.WORD_SEP = " ";
PromptParser.EMPHA_MARK = ":";
PromptParser.MODEST_BRACKETS = ["[", "]"];
PromptParser.EMPHA_BRACKETS = ["(", ")"];
PromptParser.CHUNK_SEP = ["(", "[", "]", ")", ":", " ", "\u3000", ",", "\t", "\n"];
PromptParser.SHIFT_CHUNKS = "chunks";
PromptParser.SHIFT_FIELDS = "fields";
PromptParser.SHIFT_PHRASES = "phrases";
