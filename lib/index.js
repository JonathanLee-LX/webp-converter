const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

class WebPConverter {
  constructor(options = {}) {
    this.quality = options.quality || 80;
    this.outputDir = options.outputDir || null;
  }

  async convertDirectory(inputDir, outputDir = null) {
    const dir = outputDir || inputDir;
    
    if (!fs.existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const files = await readdir(inputDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png'].includes(ext);
    });

    const results = await Promise.all(
      imageFiles.map(file => this.convertSingleImage(path.join(inputDir, file), dir))
    );

    return results;
  }

  async convertSingleImage(inputPath, outputDir = null) {
    const ext = path.extname(inputPath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    const fileName = path.basename(inputPath, ext);
    const outputPath = outputDir 
      ? path.join(outputDir, `${fileName}.webp`)
      : path.join(path.dirname(inputPath), `${fileName}.webp`);

    try {
      await sharp(inputPath)
        .webp({ quality: this.quality })
        .toFile(outputPath);

      return {
        success: true,
        input: inputPath,
        output: outputPath,
        quality: this.quality
      };
    } catch (error) {
      return {
        success: false,
        input: inputPath,
        error: error.message
      };
    }
  }

  async convertFiles(filePaths, outputDir = null) {
    const results = await Promise.all(
      filePaths.map(filePath => this.convertSingleImage(filePath, outputDir))
    );
    return results;
  }
}

module.exports = WebPConverter;