const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('CLI', () => {
  const converterPath = path.join(__dirname, '..', 'bin', 'converter');
  const testDir = path.join(__dirname, 'test-images');
  const outputDir = path.join(__dirname, 'test-output');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  test('should show help', () => {
    const output = execSync(`node ${converterPath} --help`, { encoding: 'utf8' });
    expect(output).toContain('WebP 图片转换器');
    expect(output).toContain('--quality');
    expect(output).toContain('--output');
  });

  test('should show version', () => {
    const output = execSync(`node ${converterPath} --version`, { encoding: 'utf8' });
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test('should convert single file', async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const sharp = require('sharp');
    const testImage = path.join(testDir, 'cli-single-test.jpg');

    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 255, b: 0 }
      }
    }).jpeg().toFile(testImage);

    const output = execSync(`node ${converterPath} ${testImage}`, { encoding: 'utf8' });
    expect(output).toContain('原始尺寸');
    expect(output).toContain('转换尺寸');
    expect(output).toContain('优化比例');
  });

  test('should convert directory', async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const sharp = require('sharp');
    const testImage = path.join(testDir, 'cli-test.jpg');

    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    }).jpeg().toFile(testImage);

    const output = execSync(`node ${converterPath} ${testDir}`, { encoding: 'utf8' });
    expect(output).toContain('转换完成');
    expect(output).toContain('总计');
  });
});
