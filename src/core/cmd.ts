export interface Cmd {
  command: string;
  success: boolean,
  error: boolean;
  result: string;
  in_progress: boolean;
  onResult(result: string): void
  onError(err?: string): void
}
