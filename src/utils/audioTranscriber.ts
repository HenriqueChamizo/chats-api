import { exec } from "child_process";

export default (audioPath: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    exec(
      `python3 transcriber/transcribe.py ${audioPath}`,
      (error, stdout, stderr) => {
        if (error) {
          reject(`Erro ao transcrever: ${stderr}`);
        } else {
          resolve(stdout);
        }
      }
    );
  });
};
