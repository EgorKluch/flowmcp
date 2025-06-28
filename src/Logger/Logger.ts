// Logger is now independent - no external dependencies

type GroupedError = {
  message?: string;
  contexts: { context: unknown; amount: number }[];
};

type GroupedWarning = {
  message?: string;
  contexts: { context: unknown; amount: number }[];
};

type ErrorGroup = {
  amount: number;
  contexts: { context: unknown; amount: number }[];
};

type WarningGroup = {
  amount: number;
  contexts: { context: unknown; amount: number }[];
};

export declare namespace Logger {
  type Error = {
    message?: string;
    code: string;
    context?: unknown;
  };
  
  type Warning = {
    message?: string;
    code: string;
    context?: unknown;
  };
  
  type Response = {
    errors: Array<{
      message?: string;
      code: string;
      contexts: unknown[];
    }>;
    warnings: Array<{
      message?: string;
      code: string;
      contexts: unknown[];
    }>;
  };
}

export class Logger {
  readonly errors: Record<string, ErrorGroup> = {};
  readonly warnings: Record<string, WarningGroup> = {};

  addError(error: Logger.Error): void {
    const { code, message, context } = error;
    
    if (!this.errors[code]) {
      this.errors[code] = {
        amount: 0,
        contexts: []
      };
    }

    const errorGroup = this.errors[code];
    
    if (context != null) {
      const existingContext = errorGroup.contexts.find(c => c.context === context);
      if (existingContext) {
        existingContext.amount++;
      } else {
        errorGroup.contexts.push({ context, amount: 1 });
      }
    }
    
    errorGroup.amount++;
  }

  addWarning(warning: Logger.Warning): void {
    const { code, message, context } = warning;
    
    if (!this.warnings[code]) {
      this.warnings[code] = { 
        amount: 0, 
        contexts: [] 
      };
    }

    const warningGroup = this.warnings[code];
    
    if (context != null) {
      const existingContext = warningGroup.contexts.find(c => c.context === context);
      if (existingContext) {
        existingContext.amount++;
      } else {
        warningGroup.contexts.push({ context, amount: 1 });
      }
    }
    
    warningGroup.amount++;
  }

  getResponse(): Logger.Response {
    const topErrors = this.getTopErrors();
    const topWarnings = this.getTopWarnings();
    
    return {
      errors: topErrors,
      warnings: topWarnings
    };
  }

  private getTopErrors() {
    const allErrors: Array<{ message?: string; code: string; amount: number; contexts: unknown[] }> = [];
    
    for (const [code, errorGroup] of Object.entries(this.errors)) {
      allErrors.push({
        code,
        amount: errorGroup.amount,
        contexts: errorGroup.contexts
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10)
          .map(c => c.context)
      });
    }
    
    return allErrors
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(({ code, contexts }) => ({ code, contexts }));
  }

  private getTopWarnings() {
    const allWarnings: Array<{ message?: string; code: string; amount: number; contexts: unknown[] }> = [];
    
    for (const [code, warningGroup] of Object.entries(this.warnings)) {
      allWarnings.push({
        code,
        amount: warningGroup.amount,
        contexts: warningGroup.contexts
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10)
          .map(c => c.context)
      });
    }
    
    return allWarnings
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(({ code, contexts }) => ({ code, contexts }));
  }
} 
