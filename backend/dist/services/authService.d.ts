export interface User {
    id: string;
    username: string;
    email: string;
}
export declare function registerUser(username: string, email: string, password: string): Promise<{
    user: User;
    token: string;
}>;
export declare function loginUser(usernameOrEmail: string, password: string): Promise<{
    user: User;
    token: string;
}>;
export declare function verifyToken(token: string): {
    userId: string;
};
export declare function getUserById(userId: string): Promise<User | null>;
//# sourceMappingURL=authService.d.ts.map