interface ContactInfo {
  name?: string[];
  tel?: string[];
  email?: string[];
}

interface ContactsManager {
  select(properties: string[], options?: { multiple?: boolean }): Promise<ContactInfo[]>;
  getProperties(): Promise<string[]>;
}

interface Navigator {
  contacts?: ContactsManager;
}
