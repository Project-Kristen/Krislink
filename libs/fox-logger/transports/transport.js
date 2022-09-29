class Transport {
    setFormatter(formater) {
        throw new Error("Not implemented.");
    }

    log(level, ...message) {
        throw new Error("Not implemented.");
    }
}

module.exports = Transport;