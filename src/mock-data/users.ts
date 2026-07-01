import { Roles } from "./enums";

export const mockUsers: Array<{
  id: string;
  role: typeof Roles[keyof typeof Roles];
  name: string;
  username: string;
  email: string;
}> = [];
