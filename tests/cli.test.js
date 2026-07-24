const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('CLI', () => {
  const converterPath = path.join(__dirname, '..', 'bin', 'converter');
  const testDir = path.join(__dirname, 'test-images');
  const outputDir = path.join(__dirname, 'test-output');

  beforeAll(() => {
    // 创建测试目录
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // 清理测试文件
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
    expect(output).toContain('convert');
    expect(output).toContain('info');
  });

  test('should show version', () => {
    const output = execSync(`node ${converterPath} --version`, { encoding: 'utf8' });
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test('should show info', () => {
    const output = execSync(`node ${converterPath} info`, { encoding: 'utf8' });
    expect(output).toContain('WebP Converter');
    expect(output).toContain('功能特性');
    expect(output).toContain('使用方法');
  });

  test('should show convert help', () => {
    const output = execSync(`node ${converterPath} convert --help`, { encoding: 'utf8' });
    expect(output).toContain('转换图片为 WebP 格式');
    expect(output).toContain('--quality');
    expect(output).toContain('--output');
    expect(output).toContain('--file');
  });

  test('should convert directory', async () => {
    // 确保目录存在
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // 创建测试图片
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

    const output = execSync(`node ${converterPath} convert ${testDir}`, { encoding: 'utf8' });
    expect(output).toContain('转换完成');
    expect(output).toContain('成功');
  });

  test('should convert single file', async () => {
    // 确保目录存在
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // 创建测试图片
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

    const output = execSync(`node ${converterPath} convert --file ${testImage}`, { encoding: 'utf8' });
    expect(output).toContain('转换成功');
  });
});