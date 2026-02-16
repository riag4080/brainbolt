import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function getNext(req: AuthRequest, res: Response): Promise<void>;
export declare function postAnswer(req: AuthRequest, res: Response): Promise<void>;
export declare function getMetrics(req: AuthRequest, res: Response): Promise<void>;
export declare function getScoreLeaderboard(req: AuthRequest, res: Response): Promise<void>;
export declare function getStreakLeaderboard(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=quizController.d.ts.map