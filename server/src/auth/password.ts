import bcrypt from 'bcryptjs';
export const hashPassword = (pw: string): Promise<string> => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string): Promise<boolean> => bcrypt.compare(pw, hash);
