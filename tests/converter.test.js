const WebPConverter = require('../lib/index');
const path = require('path');
const fs = require('fs');

describe('WebPConverter', () => {
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

  test('should create converter with default options', () => {
    const converter = new WebPConverter();
    expect(converter.quality).toBe(80);
    expect(converter.outputDir).toBeNull();
  });

  test('should create converter with custom options', () => {
    const converter = new WebPConverter({ quality: 90, outputDir: './output' });
    expect(converter.quality).toBe(90);
    expect(converter.outputDir).toBe('./output');
  });

  test('should have correct methods', () => {
    const converter = new WebPConverter();
    expect(typeof converter.convertDirectory).toBe('function');
    expect(typeof converter.convertSingleImage).toBe('function');
    expect(typeof converter.convertFiles).toBe('function');
  });

  test('should convert single image', async () => {
    // 创建一个简单的测试图片
    const sharp = require('sharp');
    const testImage = path.join(testDir, 'test.jpg');
    
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    }).jpeg().toFile(testImage);

    const converter = new WebPConverter({ quality: 80 });
    const result = await converter.convertSingleImage(testImage, outputDir);

    expect(result.success).toBe(true);
    expect(result.input).toBe(testImage);
    expect(result.output).toContain('.webp');
    expect(result.quality).toBe(80);

    // 验证输出文件存在
    expect(fs.existsSync(result.output)).toBe(true);
  });

  test('should convert directory', async () => {
    // 创建多个测试图片
    const sharp = require('sharp');
    
    for (let i = 0; i < 3; i++) {
      await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: i * 80, g: 100, b: 200 }
        }
      }).jpeg().toFile(path.join(testDir, `dir-test-${i}.jpg`));
    }

    const converter = new WebPConverter({ quality: 85 });
    const results = await converter.convertDirectory(testDir, outputDir);

    expect(results.length).toBeGreaterThan(0);
    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.output).toContain('.webp');
    });
  });

  test('should handle invalid file', async () => {
    const converter = new WebPConverter();
    const result = await converter.convertSingleImage('/nonexistent/file.jpg');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});