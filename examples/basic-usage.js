const WebPConverter = require('../lib/index');
const path = require('path');
const fs = require('fs');

async function example() {
  console.log('WebP Converter 使用示例\n');

  // 创建示例目录
  const exampleDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(exampleDir)) {
    fs.mkdirSync(exampleDir, { recursive: true });
  }

  // 创建示例图片
  const sharp = require('sharp');
  const testImage = path.join(exampleDir, 'example.jpg');
  
  await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 100, g: 150, b: 200 }
    }
  }).jpeg().toFile(testImage);

  console.log('1. 创建转换器实例');
  const converter = new WebPConverter({ quality: 85 });
  console.log(`   质量设置: ${converter.quality}\n`);

  console.log('2. 转换单个图片');
  const singleResult = await converter.convertSingleImage(testImage);
  console.log(`   输入: ${singleResult.input}`);
  console.log(`   输出: ${singleResult.output}`);
  console.log(`   成功: ${singleResult.success}\n`);

  console.log('3. 批量转换目录');
  const dirResult = await converter.convertDirectory(exampleDir);
  console.log(`   转换文件数: ${dirResult.length}`);
  console.log(`   成功转换: ${dirResult.filter(r => r.success).length}\n`);

  // 清理
  fs.rmSync(exampleDir, { recursive: true, force: true });
  
  console.log('示例完成!');
}

example().catch(console.error);