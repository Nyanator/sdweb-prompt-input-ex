class TextSplitter {
    static generateChunksWithSeparators(text, separators) {
        let patternStr = "";
        for (let i = 0; i < separators.length; i++) {
            if (i > 0) {
                patternStr += "|";
            }
            patternStr += "(" + this.escRe(separators[i]) + ")";
        }
        const pattern = new RegExp(patternStr, "g");
        const textChunks = text
            .split(pattern)
            .filter((chunk) => chunk !== undefined && chunk !== "");
        return Chunk.textChunksToObjectChunks(textChunks);
    }
    static getChunkIndexFromOriginalIndex(chunks, originalIndex) {
        const chunkIndex = chunks.findIndex((chunk) => originalIndex >= chunk.start && originalIndex < chunk.end);
        if (chunks[chunks.length - 1].end === originalIndex) {
            return chunks.length - 1;
        }
        return chunkIndex;
    }
    static generateShiftedChunks(chunks, chunkIndex, shiftAmount, direction, separators) {
        const originalIndex = chunkIndex;
        let shiftCount = 0;
        let shiftDirection = 1;
        if (direction === this.SHIFT_LEFT) {
            shiftDirection = -1;
        }
        const newChunks = [...chunks];
        while (shiftCount < shiftAmount) {
            chunkIndex += shiftDirection;
            if (chunkIndex < 0) {
                chunkIndex = chunks.length - 1;
            }
            else if (chunkIndex >= chunks.length) {
                chunkIndex = 0;
            }
            if (separators.includes(chunks[chunkIndex].text)) {
                continue;
            }
            shiftCount++;
        }
        const temp = newChunks[chunkIndex];
        newChunks[chunkIndex] = newChunks[originalIndex];
        newChunks[originalIndex] = temp;
        Chunk.recalcChunks(newChunks);
        return { movedChunk: newChunks[chunkIndex], newChunks };
    }
    static getBracketsIndexFromChunks(chunks, chunkIndex, startBracket, endBracket) {
        const stack = [];
        for (let i = 0; i < chunks.length; i++) {
            if (chunks[i].text === startBracket) {
                stack.push(i);
            }
            else if (chunks[i].text === endBracket) {
                if (stack.length === 0) {
                    return { start: -1, end: -1 };
                }
                const start = stack.pop();
                if (start <= chunkIndex && i >= chunkIndex) {
                    return { start: start, end: i };
                }
            }
        }
        return { start: -1, end: -1 };
    }
    static escRe(str) {
        const escapedStr = str.replace(new RegExp("[-/\\\\^$*+?.()|[\\]{}]", "g"), "\\$&");
        return escapedStr;
    }
    static checkNumeric(str) {
        return new RegExp("^-?\\d+(\\.\\d+)?$").test(str);
    }
}
TextSplitter.SHIFT_LEFT = "left";
TextSplitter.SHIFT_RIGHT = "right";
class Chunk {
    constructor(text, start) {
        this.text = text;
        this.start = start;
        this.end = start + this.text.length;
    }
    static textChunksToObjectChunks(textChunks) {
        let start = 0;
        const chunks = [];
        for (const textChunk of textChunks) {
            chunks.push(new Chunk(textChunk, start));
            start += textChunk.length;
        }
        return chunks;
    }
    static recalcChunks(chunks) {
        let start = 0;
        for (const chunk of chunks) {
            chunk.start = start;
            chunk.end = chunk.start + chunk.text.length;
            start = chunk.end;
        }
    }
}
