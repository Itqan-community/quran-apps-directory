import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.url;
    const appId = searchParams.get('id');
    const lang = searchParams.get('lang') || 'ar';
    
    // Fetch app data (simplified - would call actual API)
    const appData = await fetchAppData(appId);
    
    const appName = lang === 'ar' ? appData.Name_Ar : appData.Name_En;
    const appDesc = lang === 'ar' 
      ? appData.Short_Description_Ar 
      : appData.Short_Description_En;

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1200px',
            height: '630px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '60px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '40px',
              marginBottom: '40px',
            }}
          >
            <img
              src={appData.icon}
              width="200"
              height="200"
              style={{
                borderRadius: '32px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1
                style={{
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  margin: '0 0 20px 0',
                  lineHeight: 1.1,
                }}
              >
                {appName}
              </h1>
              <p
                style={{
                  fontSize: '36px',
                  color: '#a0a0a0',
                  margin: 0,
                  maxWidth: '800px',
                  lineHeight: 1.4,
                }}
              >
                {appDesc}
              </p>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginTop: '20px',
            }}
          >
            <span
              style={{
                fontSize: '28px',
                color: '#4CAF50',
                background: 'rgba(76, 175, 80, 0.2)',
                padding: '12px 24px',
                borderRadius: '30px',
              }}
            >
              {lang === 'ar' ? 'تطبيق قرآني' : 'Quran App'}
            </span>
            <span
              style={{
                fontSize: '28px',
                color: '#FFC107',
                background: 'rgba(255, 193, 7, 0.2)',
                padding: '12px 24px',
                borderRadius: '30px',
              }}
            >
              {appData.rating} ★
            </span>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              fontSize: '24px',
              color: '#666',
            }}
          >
            quran-apps.itqan.dev
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('OG Image Error:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}

async function fetchAppData(appId: string | null) {
  // Mock data - would fetch from actual API
  return {
    Name_Ar: 'تطبيق القرآن',
    Name_En: 'Quran App',
    Short_Description_Ar: 'تطبيق قرآني شامل',
    Short_Description_En: 'Comprehensive Quran app',
    icon: 'https://example.com/icon.png',
    rating: '4.8',
  };
}
