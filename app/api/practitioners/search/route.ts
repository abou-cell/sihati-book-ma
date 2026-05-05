import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { searchPractitioners } from '@/lib/services/practitioner-search.service';
import { practitionerSearchQuerySchema } from '@/lib/validators/practitioner-search';

export async function GET(request: Request) {
  try {
    const rawParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const query = practitionerSearchQuerySchema.parse(rawParams);

    const result = await searchPractitioners(query);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: 'Invalid query parameters',
          errors: error.flatten(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: 'Unexpected server error',
      },
      { status: 500 },
    );
  }
}
