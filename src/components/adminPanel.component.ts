import { UserProfile } from '../types/user.types';

export function deactivateUser(user: UserProfile): void {
  user.isActive = false;
  console.log(`User ${user.username} deactivated.`);
}

export function activateUser(user: UserProfile): void {
  user.isActive = true;
  console.log(`User ${user.username} activated.`);
}
