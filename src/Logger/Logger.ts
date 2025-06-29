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
  errors: GroupedError[];
};

type WarningGroup = {
  amount: number;
  warnings: GroupedWarning[];
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
        errors: []
      };
    }

    const errorGroup = this.errors[code];
    
    // Find existing error with same message
    let existingError = errorGroup.errors.find(e => e.message === message);
    if (!existingError) {
      existingError = {
        ...(message !== undefined && { message }),
        contexts: []
      };
      errorGroup.errors.push(existingError);
    }

    if (context != null) {
      const existingContext = existingError.contexts.find(c => c.context === context);
      if (existingContext) {
        existingContext.amount++;
      } else {
        existingError.contexts.push({ context, amount: 1 });
      }
    }
    
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
    
    // Find existing warning with same message
    let existingWarning = warningGroup.warnings.find(w => w.message === message);
    if (!existingWarning) {
      existingWarning = {
        ...(message !== undefined && { message }),
        contexts: []
      };
      warningGroup.warnings.push(existingWarning);
    }
    
    if (context != null) {
      const existingContext = existingWarning.contexts.find(c => c.context === context);
      if (existingContext) {
        existingContext.amount++;
      } else {
        existingWarning.contexts.push({ context, amount: 1 });
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

  hasError(name: string): boolean {
    return this.errors[name] !== undefined;
  }

  hasWarning(name: string): boolean {
    return this.warnings[name] !== undefined;
  }

  getError(name: string): ErrorGroup | undefined {
    return this.errors[name];
  }

  getWarning(name: string): WarningGroup | undefined {
    return this.warnings[name];
  }

  private getTopErrors() {
    const allErrors: Array<{ message?: string; code: string; amount: number; contexts: unknown[] }> = [];
    
    for (const [code, errorGroup] of Object.entries(this.errors)) {
      for (const error of errorGroup.errors) {
        const errorWithOptionalMessage: { message?: string; code: string; amount: number; contexts: unknown[] } = {
          code,
          amount: error.contexts.reduce((sum, ctx) => sum + ctx.amount, 0),
          contexts: error.contexts
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10)
            .map(c => c.context)
        };
        if (error.message !== undefined) {
          errorWithOptionalMessage.message = error.message;
        }
        allErrors.push(errorWithOptionalMessage);
      }
    }
    
    return allErrors
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(({ code, message, contexts }) => ({ code, ...(message !== undefined && { message }), contexts }));
  }

  private getTopWarnings() {
    const allWarnings: Array<{ message?: string; code: string; amount: number; contexts: unknown[] }> = [];
    
    for (const [code, warningGroup] of Object.entries(this.warnings)) {
      for (const warning of warningGroup.warnings) {
        const warningWithOptionalMessage: { message?: string; code: string; amount: number; contexts: unknown[] } = {
          code,
          amount: warning.contexts.reduce((sum, ctx) => sum + ctx.amount, 0),
          contexts: warning.contexts
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10)
            .map(c => c.context)
        };
        if (warning.message !== undefined) {
          warningWithOptionalMessage.message = warning.message;
        }
        allWarnings.push(warningWithOptionalMessage);
      }
    }
    
    return allWarnings
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(({ code, message, contexts }) => ({ code, ...(message !== undefined && { message }), contexts }));
  }
} 
