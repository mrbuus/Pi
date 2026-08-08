export class SmsBulkDto {
  recipients: string[];
  text: string;
  templateId?: string;
}
