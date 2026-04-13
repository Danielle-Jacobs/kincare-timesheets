import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      idNumber: string | null;
      contactNumber: string | null;
    };
  }

  interface User {
    role: string;
    idNumber: string | null;
    contactNumber: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    idNumber: string | null;
    contactNumber: string | null;
  }
}
