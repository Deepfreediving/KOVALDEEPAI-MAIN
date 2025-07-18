declare module 'bcrypt' {
  import { Hash } from 'crypto';

  interface Bcrypt {
    hash(data: string, saltOrRounds: string | number, callback: (err: Error, encrypted: string) => void): void;
    compare(data: string, encrypted: string, callback: (err: Error, same: boolean) => void): void;
    // Add other bcrypt methods you use here...
  }

  const bcrypt: Bcrypt;
  export = bcrypt;
}
