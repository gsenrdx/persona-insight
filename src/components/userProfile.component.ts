import { UserProfile } from '../types/user.types';

export function displayUserProfile(user: UserProfile): void {
  console.log(`Username: ${user.username}, Email: ${user.email}`);
}
