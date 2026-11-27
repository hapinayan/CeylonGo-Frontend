
import { Injectable } from '@angular/core';

export type DemoUser = {
  email: string;
  fullName: string;
  phone: string;
};

@Injectable({
  providedIn: 'root'
})
export class DemoAuth {

  // Temporary passwords stay in Angular memory only.
  // They disappear when the browser page reloads.
  private readonly passwords = new Map<string, string>();

  private readonly usersKey = 'ceylongo_demo_users';

  getUsers(): DemoUser[] {
    try {
      const saved = localStorage.getItem(this.usersKey);
      const parsed: unknown = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (item): item is DemoUser =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.email === 'string' &&
          typeof item.fullName === 'string' &&
          typeof item.phone === 'string'
      );
    } catch {
      return [];
    }
  }

  isRegistered(email: string): boolean {
    const normalized = email.trim().toLowerCase();

    return this.getUsers().some(
      user => user.email === normalized
    );
  }

  register(
    user: DemoUser,
    password: string
  ): boolean {

    const email = user.email.trim().toLowerCase();

    if (this.isRegistered(email)) {
      return false;
    }

    const users = this.getUsers();

    users.push({
      ...user,
      email
    });

    // Save non-sensitive demo profile data.
    localStorage.setItem(
      this.usersKey,
      JSON.stringify(users)
    );

    // Store demo password only in application memory.
    this.passwords.set(email, password);

    return true;
  }

  login(email: string, password: string): boolean {
    const normalized = email.trim().toLowerCase();

    return this.passwords.get(normalized) === password &&
      this.passwords.has(normalized);
  }

  resetPassword(email: string, newPassword: string): boolean {
    const normalized = email.trim().toLowerCase();

    if (!this.isRegistered(normalized)) {
      return false;
    }

    this.passwords.set(normalized, newPassword);
    return true;
  }
}
