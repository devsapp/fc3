class Logger {
  instance: any;

  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  write: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  output: (...args: unknown[]) => void;
  spin: (...args: unknown[]) => void;
  append: (...args: unknown[]) => void;

  _set = (logger) => {
    this.log = (...args) => logger.log.apply(logger, args);
    this.info = (...args) => logger.info.apply(logger, args);
    this.debug = (...args) => logger.debug.apply(logger, args);
    this.warn = (...args) => logger.warn.apply(logger, args);
    this.write = (...args) => logger.write.apply(logger, args);
    this.error = (...args) => logger.error.apply(logger, args);
    this.output = (...args) => logger.output.apply(logger, args);
    this.spin = (...args) => logger.spin.apply(logger, args);
    this.append = (...args) => logger.append.apply(logger, args);
    this.instance = logger;
  };
}

export default new Logger();
