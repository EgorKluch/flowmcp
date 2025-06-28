// Logger is now independent - no external dependencies

type GroupedError = {
  message: string;
  contexts: { context: unknown; amount: number }[];
};

type GroupedWarning = {
  message: string;
  contexts: { context: unknown; amount: number }[];
};

type ErrorGroup = {
  amount: number;
  errors: GroupedError[];
};

type WarningGroup = {
  amount: number;
  warnings: GroupedWarning[];
};

export declare namespace Logger {
  type Error = {
    message: string;
    code: string;
    context?: unknown;
  };
  
  type Warning = {
    message: string;
    code: string;
    context?: unknown;
  };
  
  type Response = {
    errors: Array<{
      message: string;
      code: string;
      contexts: unknown[];
    }>;
    warnings: Array<{
      message: string;
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
        errors: []
      };
    }

    const errorGroup = this.errors[code];
    const existingError = errorGroup.errors.find(e => e.message === message);
    
    if (existingError) {
      if (context != null) {
        const existingContext = existingError.contexts.find(c => c.context === context);
        if (existingContext) {
          existingContext.amount++;
        } else {
          existingError.contexts.push({ context, amount: 1 });
        }
      }
      errorGroup.amount++;
      return;
    }

    errorGroup.errors.push({
      message,
      contexts: context != null ? [{ context, amount: 1 }] : []
    });
    errorGroup.amount++;
  }

  addWarning(warning: Logger.Warning): void {
    const { code, message, context } = warning;
    
    if (!this.warnings[code]) {
      this.warnings[code] = { 
        amount: 0, 
        warnings: [] 
      };
    }

    const warningGroup = this.warnings[code];
    const existingWarning = warningGroup.warnings.find(w => w.message === message);

    if (existingWarning) {
      if (context != null) {
        const existingContext = existingWarning.contexts.find(c => c.context === context);
        if (existingContext) {
          existingContext.amount++;
        } else {
          existingWarning.contexts.push({ context, amount: 1 });
        }
      }
      warningGroup.amount++;
      return;
    }

    warningGroup.warnings.push({
      message,
      contexts: context != null ? [{ context, amount: 1 }] : []
    });
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
    const allErrors: Array<{ message: string; code: string; amount: number; contexts: unknown[] }> = [];
    
    for (const [code, errorGroup] of Object.entries(this.errors)) {
      for (const error of errorGroup.errors) {
        allErrors.push({
          message: error.message,
          code,
          amount: errorGroup.amount,
          contexts: error.contexts
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10)
            .map(c => c.context)
        });
      }
    }
    
    return allErrors
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(({ message, code, contexts }) => ({ message, code, contexts }));
  }

  private getTopWarnings() {
    const allWarnings: Array<{ message: string; code: string; amount: number; contexts: unknown[] }> = [];
    
    for (const [code, warningGroup] of Object.entries(this.warnings)) {
      for (const warning of warningGroup.warnings) {
        allWarnings.push({
          message: warning.message,
          code,
          amount: warningGroup.amount,
          contexts: warning.contexts
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10)
            .map(c => c.context)
        });
      }
    }
    
    return allWarnings
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(({ message, code, contexts }) => ({ message, code, contexts }));
  }
} 
