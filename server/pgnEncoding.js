function decodePgnContent(content) {
	if (typeof content === "string") {
		return content;
	}

	if (!Buffer.isBuffer(content) && !(content instanceof Uint8Array)) {
		return "";
	}

	const bytes = Buffer.isBuffer(content)
		? content
		: Buffer.from(content.buffer, content.byteOffset, content.byteLength);

	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return new TextDecoder("windows-1252").decode(bytes);
	}
}

module.exports = {
	decodePgnContent,
};
