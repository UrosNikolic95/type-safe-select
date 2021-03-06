export interface StrToStr {
  [key: string]: string;
}

export interface MappedAliases {
  [key: string]: Alias;
}

export interface Alias {
  association: string;
  alias: string;
}

export interface Obj<T> {
  [key: string]: T;
}
