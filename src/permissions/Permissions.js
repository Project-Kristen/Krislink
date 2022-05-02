module.exports = class Permission {
    constructor(value=0) {
        this.value = value;
    }

    add(permission) {
        this.value |= permission.value;
    }

    massAdd(permissions) {
        permissions.forEach(permission => this.add(permission));
    }

    remove(permission) {
        this.value &= ~permission.value;
    }

    massRemove(permissions) {
        permissions.forEach(permission => this.remove(permission));
    }

    has(permission) {
        return (this.value & permission.value) !== 0;
    }

    hasAll(permissions) {
        return permissions.every(permission => this.has(permission));
    }

    hasAny(permissions) {
        return permissions.some(permission => this.has(permission));
    }

    hasNone(permissions) {
        return !this.hasAny(permissions);
    }

    toString() {
        return this.value.toString('hex');
    }
}