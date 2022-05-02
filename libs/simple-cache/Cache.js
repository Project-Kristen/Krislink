module.exports = class Cache extends Map {
    constructor() {
        super()
    }

    set(key, value, ttl=30) {
        super.set(key, value)
        setTimeout(() => {
            super.delete(key)
        }, ttl * 1000)
    }

    *[Symbol.iterator]() {
        for (let key of this.keys()) {
            yield [key, this.get(key)]
        }
    }
}