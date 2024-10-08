export function AVTokenMixin(Base) {
    return class AVToken extends Base {
        constructor(...args) {
            super(...args);
            console.log("THIS IS A SPECIAL TOKEN");
        }
    }
}

export class AVToken extends Token {
    constructor(...args) {
        super(...args);
        console.log("THIS IS A SPECIAL TOKEN");
    }
}

// when a Token is dropped on canvas:
//AVTokenMixin(CONFIG.Token.objectClass)
