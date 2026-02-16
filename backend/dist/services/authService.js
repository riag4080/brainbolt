"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.verifyToken = verifyToken;
exports.getUserById = getUserById;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = '7d';
async function registerUser(username, email, password) {
    // Check if user exists
    const existing = await (0, database_1.query)(`SELECT id FROM users WHERE username = $1 OR email = $2`, [username, email]);
    if (existing.rows.length > 0) {
        throw new Error('Username or email already exists');
    }
    // Hash password
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    // Create user
    const result = await (0, database_1.query)(`INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email`, [username, email, passwordHash]);
    const user = result.rows[0];
    // Generate token
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
    return {
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
        },
        token,
    };
}
async function loginUser(usernameOrEmail, password) {
    // Find user
    const result = await (0, database_1.query)(`SELECT id, username, email, password_hash
     FROM users
     WHERE username = $1 OR email = $1`, [usernameOrEmail]);
    if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
    }
    const user = result.rows[0];
    // Verify password
    const isValid = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isValid) {
        throw new Error('Invalid credentials');
    }
    // Generate token
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
    return {
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
        },
        token,
    };
}
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        throw new Error('Invalid token');
    }
}
async function getUserById(userId) {
    const result = await (0, database_1.query)(`SELECT id, username, email FROM users WHERE id = $1`, [userId]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
}
//# sourceMappingURL=authService.js.map