/**
 * User Model
 * Represents system users (admins, sales team, content managers)
 * Manages authentication and user roles
 * FIXED: Safe JSON parsing for preferences
 *
 * @module models/user.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * User role enumeration
 * Defines user access levels and permissions
 */
export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  SALES_MANAGER = "sales_manager",
  SALES_AGENT = "sales_agent",
  MARKETING = "marketing",
  CONTENT_MANAGER = "content_manager",
  VIEWER = "viewer",
}

/**
 * User entity interface
 * Represents a system user with all fields including sensitive data
 */
export interface User {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  resetToken: string | null;
  resetTokenExpiresAt: Date | null;
  avatarUrl: string | null;
  preferences: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User without sensitive data
 * Safe for API responses - excludes passwordHash and resetToken
 */
export type SafeUser = Omit<User, "passwordHash" | "resetToken">;

/**
 * Create user DTO
 */
export interface CreateUserDto {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role?: UserRole;
  isActive?: boolean;
  avatarUrl?: string | null;
}

/**
 * Update user DTO
 */
export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  role?: UserRole;
  isActive?: boolean;
  avatarUrl?: string | null;
  preferences?: any;
}

/**
 * User query parameters
 */
export interface UserQueryParams extends BaseQueryParams {
  role?: UserRole;
  isActive?: boolean;
  email?: string;
}

/**
 * Safe JSON parse helper
 */
function safeJsonParse(value: any): any {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

/**
 * User Model class
 * Handles all database operations for users
 * 
 * Note: This model returns User entities (with sensitive data) from base methods
 * and provides additional methods that return SafeUser for API responses
 */
class UserModel extends BaseModel<User, CreateUserDto, UpdateUserDto> {
  protected tableName = "users";

  /**
   * Finds all users matching query parameters
   * 
   * @override
   * @param params - Query parameters
   * @returns Promise<User[]> - Array of users (with sensitive data)
   * 
   * @example
   * const users = await UserModel.findAll({ role: UserRole.ADMIN });
   */
  async findAll(params: UserQueryParams = {}): Promise<User[]> {
    let query = this.db(this.tableName);

    if (params.role) {
      query = query.where({ role: params.role });
    }

    if (params.isActive !== undefined) {
      query = query.where({ is_active: params.isActive });
    }

    if (params.email) {
      query = query.where("email", "like", `%${params.email}%`);
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "asc");
    } else {
      query = query.orderBy("created_at", "desc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const users = await query;
    return users.map(this.mapToEntity);
  }

  /**
   * Finds all users as safe entities (without sensitive data)
   * Use this method for API responses
   *
   * @param params - Query parameters
   * @returns Promise<SafeUser[]> - Array of safe users
   *
   * @example
   * const users = await UserModel.findAllSafe({ role: UserRole.ADMIN });
   */
  async findAllSafe(params: UserQueryParams = {}): Promise<SafeUser[]> {
    const users = await this.findAll(params);
    return users.map(this.toSafeUser);
  }

  /**
   * Finds a user by email
   * Returns full user with sensitive data (for authentication)
   *
   * @param email - Email address
   * @returns Promise<User | null> - User or null if not found
   *
   * @example
   * const user = await UserModel.findByEmail("admin@example.com");
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Finds a safe user by ID (without sensitive data)
   * Use this for API responses
   *
   * @param id - User ID
   * @returns Promise<SafeUser | null> - Safe user or null if not found
   *
   * @example
   * const user = await UserModel.findSafeById(1);
   */
  async findSafeById(id: number): Promise<SafeUser | null> {
    const user = await this.findById(id);
    return user ? this.toSafeUser(user) : null;
  }

  /**
   * Updates user password
   * Also clears any existing reset tokens
   *
   * @param userId - User ID
   * @param passwordHash - New password hash
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await UserModel.updatePassword(1, hashedPassword);
   */
  async updatePassword(userId: number, passwordHash: string): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id: userId }).update({
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expires_at: null,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Sets password reset token
   * Used for password reset functionality
   *
   * @param userId - User ID
   * @param token - Reset token
   * @param expiresAt - Token expiration date
   * @returns Promise<boolean> - Success status
   *
   * @example
   * const expiresAt = new Date(Date.now() + 3600000); // 1 hour
   * await UserModel.setResetToken(1, "random-token", expiresAt);
   */
  async setResetToken(
    userId: number,
    token: string,
    expiresAt: Date
  ): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id: userId }).update({
      reset_token: token,
      reset_token_expires_at: expiresAt,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Finds user by reset token
   * Validates that token hasn't expired
   *
   * @param token - Reset token
   * @returns Promise<User | null> - User or null if token invalid/expired
   *
   * @example
   * const user = await UserModel.findByResetToken(token);
   */
  async findByResetToken(token: string): Promise<User | null> {
    const user = await this.db(this.tableName)
      .where({ reset_token: token })
      .where("reset_token_expires_at", ">", new Date())
      .first();

    return user ? this.mapToEntity(user) : null;
  }

  /**
   * Updates last login timestamp
   * Called when user successfully authenticates
   *
   * @param userId - User ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await UserModel.updateLastLogin(1);
   */
  async updateLastLogin(userId: number): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: userId })
      .update({ last_login_at: this.db.fn.now() });

    return updated > 0;
  }

  /**
   * Activates or deactivates a user account
   *
   * @param userId - User ID
   * @param isActive - Active status
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await UserModel.setActive(1, false); // Deactivate user
   */
  async setActive(userId: number, isActive: boolean): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id: userId }).update({
      is_active: isActive,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Gets users by role
   * Returns safe users without sensitive data
   *
   * @param role - User role
   * @returns Promise<SafeUser[]> - Users with that role
   *
   * @example
   * const admins = await UserModel.findByRole(UserRole.ADMIN);
   */
  async findByRole(role: UserRole): Promise<SafeUser[]> {
    const users = await this.findWhere({ role });
    return users.map(this.toSafeUser);
  }

  /**
   * Gets all active users
   * Returns safe users without sensitive data
   *
   * @returns Promise<SafeUser[]> - Active users
   *
   * @example
   * const activeUsers = await UserModel.getActive();
   */
  async getActive(): Promise<SafeUser[]> {
    const users = await this.findWhere({ is_active: true });
    return users.map(this.toSafeUser);
  }

  /**
   * Gets all sales team members (managers and agents)
   * Returns safe users without sensitive data
   *
   * @returns Promise<SafeUser[]> - Sales team users
   *
   * @example
   * const salesTeam = await UserModel.getSalesTeam();
   */
  async getSalesTeam(): Promise<SafeUser[]> {
    const users = await this.db(this.tableName)
      .whereIn("role", [UserRole.SALES_MANAGER, UserRole.SALES_AGENT])
      .where({ is_active: true })
      .orderBy("first_name", "asc");

    return users.map((u: any) => this.toSafeUser(this.mapToEntity(u)));
  }

  /**
   * Updates user preferences
   * Stores JSON preferences object
   *
   * @param userId - User ID
   * @param preferences - Preferences object
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await UserModel.updatePreferences(1, { theme: "dark", language: "en" });
   */
  async updatePreferences(userId: number, preferences: any): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: userId })
      .update({
        preferences: JSON.stringify(preferences),
        updated_at: this.db.fn.now(),
      });

    return updated > 0;
  }

  /**
   * Gets user statistics by role
   *
   * @returns Promise<Record<string, number>> - Role counts
   *
   * @example
   * const stats = await UserModel.getRoleStatistics();
   */
  async getRoleStatistics(): Promise<Record<string, number>> {
    const results = await this.db(this.tableName)
      .select("role")
      .count("* as count")
      .groupBy("role");

    const stats: Record<string, number> = {};
    results.forEach((row: any) => {
      stats[row.role] = Number(row.count);
    });

    return stats;
  }

  /**
   * Gets user activity summary
   *
   * @returns Promise<any> - Activity statistics
   *
   * @example
   * const summary = await UserModel.getActivitySummary();
   */
  async getActivitySummary(): Promise<any> {
    const [total, active, inactive, lastWeek] = await Promise.all([
      this.db(this.tableName).count("* as count").first(),

      this.db(this.tableName)
        .where({ is_active: true })
        .count("* as count")
        .first(),

      this.db(this.tableName)
        .where({ is_active: false })
        .count("* as count")
        .first(),

      this.db(this.tableName)
        .where("last_login_at", ">=", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .count("* as count")
        .first(),
    ]);

    return {
      total: Number(total?.count || 0),
      active: Number(active?.count || 0),
      inactive: Number(inactive?.count || 0),
      activeLastWeek: Number(lastWeek?.count || 0),
    };
  }

  /**
   * Converts User to SafeUser (removes sensitive data)
   * Used internally to prepare users for API responses
   *
   * @param user - User entity with sensitive data
   * @returns SafeUser - User without sensitive fields
   *
   * @private
   */
  private toSafeUser(user: User): SafeUser {
    const { passwordHash, resetToken, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Maps database record to User entity
   *
   * @param record - Database record
   * @returns User entity
   *
   * @protected
   */
  protected mapToEntity(record: any): User {
    return {
      id: record.id,
      email: record.email,
      passwordHash: record.password_hash,
      firstName: record.first_name,
      lastName: record.last_name,
      phone: record.phone,
      role: record.role as UserRole,
      isActive: Boolean(record.is_active),
      lastLoginAt: record.last_login_at ? new Date(record.last_login_at) : null,
      resetToken: record.reset_token,
      resetTokenExpiresAt: record.reset_token_expires_at
        ? new Date(record.reset_token_expires_at)
        : null,
      avatarUrl: record.avatar_url,
      preferences: safeJsonParse(record.preferences),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new UserModel();