export type ErrorCode =
  | "OVERLAP_CONFLICT"
  | "TECHNICAL_BREAK_CONFLICT"
  | "CAPACITY_EXCEEDED"
  | "OPERATING_HOURS_EXCEEDED"
  | "DAILY_LIMIT_EXCEEDED"
  | "WEEKLY_LIMIT_EXCEEDED"
  | "INVALID_TIME_RANGE"
  | "MISSING_PARAMETER"
  | "UNAUTHORIZED"
  | "RESOURCE_NOT_FOUND"
  | "TENANT_NOT_FOUND"
  | "DATABASE_ERROR"
  | "UNKNOWN_ERROR"
  | "INVALID_DAY_INDEX"
  | "INVALID_TIME_FORMAT"
  | "PAST_BOOKING_NOT_ALLOWED"
  | "SCHEDULE_RULE_NOT_FOUND";

export interface ApiErrorResponse {
  status: "error";
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
}

export function makeErrorResponse(code: ErrorCode, message: string, details?: Record<string, any>, status = 400) {
  return Response.json(
    {
      status: "error",
      code,
      message,
      details,
    },
    { status }
  );
}
