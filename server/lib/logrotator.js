import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import zlib from 'zlib';
import { EventEmitter } from 'events';

// Performs scheduled and on demand log rotation on files
class Logrotator extends EventEmitter {
  constructor() {
    super();
    this.timers = new Map();
  }

  // Schedules a file for rotation. Emits a 'rotate' event whenever the file has been rotated.
  async register(file, options = {}) {
    // 'schedule': how often to check for file rotation conditions (possible values: '1s', '1m', '1h')
    // 'size': size to trigger rotation (possible values: '1k', '1m', '1g')
    // 'count': number of files to keep
    // 'compress': whether to gzip rotated files
    // 'format': function to build the name of a rotated file (receives index)
    options = { schedule: '5m', ...options };

    const match = options.schedule.match(/^([0-9]+)(s|m|h)$/);
    if (!match) {
      this.emit('error', new Error(`Incorrect schedule format ${options.schedule}`));
      return;
    }

    if (this.timers.has(file)) {
      this.unregister(file);
    }

    // Calculate the schedule
    const multi = this.#timeMultiplier(match[2]);
    const schedule = parseInt(match[1]) * multi;

    // Perform rotation
    const doRotate = async () => {
      try {
        const rotated = await this.rotate(file, options);
        if (rotated) {
          this.emit('rotate', file);
        }
      } catch (err) {
        this.emit('error', err);
      }
    };

    // Register the rotation timer
    const timer = setInterval(doRotate, schedule);
    this.timers.set(file, timer);

    // Immediately rotate
    await doRotate();
  }

  // Remove the scheduled rotation of a file
  unregister(file) {
    const timer = this.timers.get(file);
    if (!timer) return;

    clearInterval(timer);
    this.timers.delete(file);
  }

  // Stop all schedulers
  stop() {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }

  #timeMultiplier(multi) {
    switch (multi) {
      case 's':
        return 1000;
      case 'm':
        return 60 * 1000;
      case 'h':
        return 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  #sizeMultiplier(multi) {
    switch (multi) {
      case 'k':
        return 1024;
      case 'm':
        return 1024 * 1024;
      case 'g':
        return 1024 * 1024 * 1024;
      default:
        return 0;
    }
  }

  async rotate(file, options = {}) {
    options = { size: '10m', count: 3, compress: true, ...options };

    const match = options.size.match(/^([0-9]+)(k|m|g)$/);
    if (!match) {
      throw new Error(`Incorrect size format ${options.size}`);
    }

    const multi = this.#sizeMultiplier(match[2]);
    const size = parseInt(match[1]) * multi;

    try {
      const stats = await fs.stat(file);

      // This isn't a file
      if (!stats.isFile()) {
        throw new Error(`${file} is not a file`);
      }

      // Check file size to see if rotation is needed
      if (stats.size >= size) {
        await this.#rotate(file, options.count, options);
        return true;
      }
      return false;
    } catch (err) {
      // If file does not exist, ignore
      if (err.code !== 'ENOENT') {
        throw err;
      }
      return false;
    }
  }

  // Get the correct file name based on params
  #filename(file, index, options) {
    // file: original filename
    // index: rotation index
    // options: rotation options
    let format = index;
    if (typeof options.format === 'function') {
      format = options.format(index);
    }

    let fileName = `${file}.${format}`;
    if (options.compress) {
      fileName += '.gz';
    }
    return fileName;
  }

  // The log rotation brains
  async #rotate(file, index, options) {
    // file: original filename
    // index: current rotation index
    // options: rotation options
    const fileName = this.#filename(file, index, options);

    // Delete last file
    if (index === options.count) {
      try {
        await fs.unlink(fileName);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw new Error(`Error deleting file ${fileName}: ${err.message}`);
        }
      }
      await this.#rotate(file, index - 1, options);
      return;
    }

    // Rename all files to with +1
    if (index > 0) {
      const renameTo = this.#filename(file, index + 1, options);
      try {
        await fs.rename(fileName, renameTo);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw new Error(`Error renaming file ${fileName}: ${err.message}`);
        }
      }
      await this.#rotate(file, index - 1, options);
      return;
    }

    // Read (and compress) the file log into index 1
    const fis = createReadStream(file);
    const fos = createWriteStream(this.#filename(file, 1, options));

    try {
      if (options.compress) {
        await pipeline(fis, zlib.createGzip(), fos);
      } else {
        await pipeline(fis, fos);
      }

      // Truncate log file to size 0
      await fs.truncate(file, 0);
    } catch (err) {
      throw new Error(`Error during rotation of file ${file}: ${err.message}`);
    }
  }
}

// Create a new log rotator
export function create() {
  return new Logrotator();
}

// Global log rotator instance
export const rotator = new Logrotator();

export default Logrotator;
