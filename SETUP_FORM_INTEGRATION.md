# SetupForm Supabase Integration

## Overview

The SetupForm component has been enhanced to integrate with Supabase while maintaining all existing template functionality.

## Features

### 1. Template Selection

- **Standard Marketing**: 6 steps (Hook, Problem, Solution, Evidence, Benefit, CTA)
- **PAS Framework**: 3 steps (Problem, Agitate, Solution)
- **AIDA Framework**: 4 steps (Attention, Interest, Desire, Action)
- **FAB Analysis**: 3 steps (Features, Advantages, Benefits)
- **Problem & Solution**: 3 steps (Problem, Solution, Benefits)

### 2. Supabase Integration

When a template is selected and the form is submitted, the system:

1. **Creates/Updates Project**: Saves project data to the `projects` table
2. **Creates Storyboard**: Generates a storyboard in the `storyboards` table
3. **Creates Cards**: Saves all step cards to the `cards` table
4. **Generates Images**: Creates AI-generated images for steps with image prompts

### 3. Database Schema

The integration works with these tables:

#### Projects Table

- `id`: Unique project identifier
- `user_id`: Associated user ID
- `title`: Project name (customizable)
- `description`: Auto-generated description
- `is_public`: Visibility setting
- `created_at`, `updated_at`: Timestamps

#### Storyboards Table

- `id`: Unique storyboard identifier
- `project_id`: Associated project ID
- `user_id`: Associated user ID
- `title`: Storyboard name
- `description`: Template description
- `is_public`: Visibility setting
- `created_at`, `updated_at`: Timestamps

#### Cards Table

- `id`: Unique card identifier
- `storyboard_id`: Associated storyboard ID
- `user_id`: Associated user ID
- `type`: Card type (hook, problem, solution, etc.)
- `title`: Step title
- `content`: Step description
- `image_url`: Generated image URL (if applicable)
- `position_x`, `position_y`: Canvas positioning
- `width`, `height`: Card dimensions
- Styling is now hardcoded for consistency across all cards
- `order_index`: Step sequence
- `created_at`, `updated_at`: Timestamps

### 4. API Endpoints

New API routes have been created:

- `POST /api/projects` - Create new project
- `GET /api/projects` - Fetch user's projects
- `PUT /api/projects` - Update existing project
- `POST /api/storyboards` - Create new storyboard
- `GET /api/storyboards` - Fetch storyboards
- `POST /api/cards` - Create cards (single or multiple)

### 5. User Experience

- **Project Title**: Users can customize their project name
- **Template Switching**: Seamless template selection with automatic project title updates
- **Image Generation**: AI-powered image creation for visual steps
- **Drag & Drop**: Reorder steps as needed
- **Real-time Updates**: Form validation and progress indicators

### 6. Authentication

- Integrates with existing Supabase authentication
- User ID is automatically retrieved from the auth store
- Unauthenticated users see appropriate messaging

## Usage

1. Navigate to `/project/[id]/setup`
2. Select a template from the left sidebar
3. Customize the project title (optional)
4. Fill in step descriptions and image prompts
5. Click "Generate Storyboard" to save to Supabase
6. Redirected to the editor with the created content

## Technical Details

### State Management

- Uses Zustand stores for canvas and user state
- Local state for form data and UI interactions
- Real-time synchronization with Supabase

### Error Handling

- Comprehensive error handling for API calls
- User-friendly error messages
- Graceful fallbacks for failed operations

### Performance

- Optimized image generation with progress indicators
- Efficient database operations
- Minimal re-renders with proper state management

## Future Enhancements

- Template categories (marketing, storytelling, etc.)
- Custom template creation
- Template sharing and collaboration
- Advanced styling options
- Export/import functionality
