import { PoolClient } from 'pg';
declare const pool: any;
export declare const query: (text: string, params?: any[]) => Promise<any>;
export declare const getClient: () => Promise<PoolClient>;
export default pool;
//# sourceMappingURL=database.d.ts.map