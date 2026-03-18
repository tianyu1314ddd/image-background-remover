import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return NextResponse.json(
        { success: false, error: '请上传图片' },
        { status: 400 }
      );
    }

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { success: false, error: '请上传 JPG、PNG 或 WebP 格式的图片' },
        { status: 400 }
      );
    }

    // 检查文件大小 (25MB)
    const maxSize = 25 * 1024 * 1024;
    if (image.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '图片大小不能超过 25MB' },
        { status: 400 }
      );
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API Key 未配置，请联系管理员' },
        { status: 500 }
      );
    }

    // 转发到 Remove.bg API
    const buffer = Buffer.from(await image.arrayBuffer());
    
    const removeBgFormData = new FormData();
    removeBgFormData.append('image_file_b64', buffer.toString('base64'));
    removeBgFormData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: removeBgFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 402 || response.status === 403) {
        return NextResponse.json(
          { success: false, error: '今日处理次数已达上限，请明天再试' },
          { status: 429 }
        );
      }
      
      if (response.status === 400) {
        return NextResponse.json(
          { success: false, error: '图片处理失败，请尝试其他图片' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: '处理失败，请稍后重试' },
        { status: 500 }
      );
    }

    const resultBuffer = Buffer.from(await response.arrayBuffer());
    const base64 = resultBuffer.toString('base64');
    
    return NextResponse.json({
      success: true,
      imageBase64: `data:image/png;base64,${base64}`,
    });
    
  } catch (error) {
    console.error('Remove background error:', error);
    return NextResponse.json(
      { success: false, error: '处理超时，请检查网络后重试' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
