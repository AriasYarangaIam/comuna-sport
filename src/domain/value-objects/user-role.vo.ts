export type UserRoleType = 'NEIGHBOR' | 'YOUTH' | 'SENIOR' | 'PRIVATE_CLUB';

export class UserRole {
    private constructor(public readonly value: UserRoleType) {}

    static create(value: string): UserRole {
        const valid: UserRoleType[] = ['NEIGHBOR', 'YOUTH', 'SENIOR', 'PRIVATE_CLUB'];
        if (!valid.includes(value as UserRoleType)) {
            throw new Error('invalid user role');
        }
        return Object.freeze(new UserRole(value as UserRoleType));
    }
}