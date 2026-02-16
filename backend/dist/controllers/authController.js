"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getCurrentUser = getCurrentUser;
const authService_1 = require("../services/authService");
const authService_2 = require("../services/authService");
async function register(req, res) {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }
        const result = await (0, authService_1.registerUser)(username, email, password);
        res.status(201).json({
            user: result.user,
            token: result.token,
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        if (error.message === 'Username or email already exists') {
            res.status(409).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Registration failed' });
    }
}
async function login(req, res) {
    try {
        const { usernameOrEmail, password } = req.body;
        if (!usernameOrEmail || !password) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const result = await (0, authService_1.loginUser)(usernameOrEmail, password);
        res.json({
            user: result.user,
            token: result.token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        if (error.message === 'Invalid credentials') {
            res.status(401).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Login failed' });
    }
}
async function getCurrentUser(req, res) {
    try {
        const userId = req.userId;
        const user = await (0, authService_2.getUserById)(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
}
//# sourceMappingURL=authController.js.map