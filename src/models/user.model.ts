/**
 * User Model
 * Represents system users (admins, sales team, content managers)
 * Manages authentication and user roles
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
 * Represents a system user
 */
export interface User {
  /** Unique identifier */
  id: number;

  /** Email address (used for login) */
  email: string;

  /** Password hash (never expose in responses) */
  passwordHash: string;

  /** First name */
  firstName: string;

  /** Last name */
  lastName: string;

  /** Phone number */
  phone: string | null;

  /** User role */
  role: UserRole;

  /** Whether the user account is active */
  isActive: boolean;

  /** Last login timestamp */
  lastLoginAt: Date | null;

  /** Password reset token */
  resetToken: string | null;

  /** Reset token expiration */
  resetTokenExpiresAt: Date | null;

  /** Avatar/profile picture URL */
  avatarUrl: string | null;

  /** User preferences (JSON) */
  preferences: any;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * User without sensitive data
 * Safe for API responses
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
 * User Model class
 * Handles all database operations for users
 */
class UserModel extends BaseModel<User, CreateUserDto, UpdateUserDto> {
  protected tableName = "users";

  /**
   * Finds all users matching query parameters
   */
  async findAll(params: UserQueryParams = {}): Promise<SafeUser[]> {
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
    return users.map((u) => this.toSafeUser(this.mapToEntity(u)));
  }

  /**
   * Finds a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Finds a safe user by ID (without sensitive data)
   */
  async findSafeById(id: number): Promise<SafeUser | null> {
    const user = await this.findById(id);
    return user ? this.toSafeUser(user) : null;
  }

  /**
   * Updates user password
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
   */
  async updateLastLogin(userId: number): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: userId })
      .update({ last_login_at: this.db.fn.now() });

    return updated > 0;
  }

  /**
   * Activates or deactivates a user
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
   */
  async findByRole(role: UserRole): Promise<SafeUser[]> {
    const users = await this.findWhere({ role });
    return users.map(this.toSafeUser);
  }

  /**
   * Gets active users
   */
  async getActive(): Promise<SafeUser[]> {
    const users = await this.findWhere({ is_active: true });
    return users.map(this.toSafeUser);
  }

  /**
   * Updates user preferences
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
   * Converts User to SafeUser (removes sensitive data)
   */
  private toSafeUser(user: User): SafeUser {
    const { passwordHash, resetToken, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Maps database record to User entity
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
      preferences: record.preferences ? JSON.parse(record.preferences) : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new UserModel();
