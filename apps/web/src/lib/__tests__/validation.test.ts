import {
  isValidMCPServerUrl,
  projectNameSchema,
  projectPathSchema,
  sanitizePath,
  sanitizeProjectName,
  validateProject,
} from '../validation'

describe('Validation Utilities', () => {
  describe('projectNameSchema', () => {
    it('should accept valid project names', () => {
      const validNames = ['My Project', 'project-123', 'test_project', 'Project 2024', 'A-B-C']

      validNames.forEach((name) => {
        expect(() => projectNameSchema.parse(name)).not.toThrow()
      })
    })

    it('should reject invalid project names', () => {
      const invalidNames = [
        '', // empty
        'a'.repeat(101), // too long
        'project@123', // invalid character
        'project#name', // invalid character
        'project/name', // invalid character
      ]

      invalidNames.forEach((name) => {
        expect(() => projectNameSchema.parse(name)).toThrow()
      })
    })
  })

  describe('projectPathSchema', () => {
    it('should accept valid paths', () => {
      const validPaths = [
        '/home/user/project',
        '~/Development/my-app',
        '/usr/local/projects/test',
        '/Users/Test',
      ]

      validPaths.forEach((path) => {
        expect(() => projectPathSchema.parse(path)).not.toThrow()
      })
    })

    it('should reject invalid paths', () => {
      const invalidPaths = [
        '', // empty
        'relative/path', // not absolute
        '/path/../etc/passwd', // path traversal
        '/path/./secret', // path traversal
      ]

      invalidPaths.forEach((path) => {
        expect(() => projectPathSchema.parse(path)).toThrow()
      })
    })
  })

  describe('sanitizePath', () => {
    it('should expand home directory', () => {
      const homePath = process.env.HOME || '/home/user'
      expect(sanitizePath('~/projects')).toBe(`${homePath}/projects`)
    })

    it('should normalize paths', () => {
      expect(sanitizePath('/path//to///project')).toBe('/path/to/project')
      expect(sanitizePath('/path/to/project/')).toBe('/path/to/project')
    })

    it('should handle already normalized paths', () => {
      expect(sanitizePath('/usr/local/bin')).toBe('/usr/local/bin')
    })
  })

  describe('sanitizeProjectName', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeProjectName('project@#$%name')).toBe('projectname')
      expect(sanitizeProjectName('my/project\\name')).toBe('myprojectname')
    })

    it('should trim whitespace', () => {
      expect(sanitizeProjectName('  project name  ')).toBe('project name')
    })

    it('should limit length', () => {
      const longName = 'a'.repeat(150)
      expect(sanitizeProjectName(longName)).toHaveLength(100)
    })
  })

  describe('validateProject', () => {
    it('should validate correct project data', () => {
      const validProject = {
        name: 'Test Project',
        path: '/home/user/test',
        description: 'A test project',
      }

      const result = validateProject(validProject)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validProject)
    })

    it('should return error for invalid data', () => {
      const invalidProject = {
        name: '',
        path: 'not/absolute',
      }

      const result = validateProject(invalidProject)
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should handle missing required fields', () => {
      const result = validateProject({ name: 'Test' })
      expect(result.success).toBe(false)
      expect(result.error).toContain('path')
    })
  })

  describe('isValidMCPServerUrl', () => {
    it('should accept valid MCP server URLs', () => {
      const validUrls = [
        'http://localhost:5173',
        'https://localhost:8080',
        'ws://localhost:3000',
        'wss://localhost:443',
        'http://127.0.0.1:8000',
        'http://192.168.1.100:5000',
        'http://10.0.0.1:3000',
      ]

      validUrls.forEach((url) => {
        expect(isValidMCPServerUrl(url)).toBe(true)
      })
    })

    it('should reject invalid MCP server URLs', () => {
      const invalidUrls = [
        'ftp://localhost:5173', // wrong protocol
        'http://example.com:5173', // not localhost/private
        'http://google.com', // external domain
        'not-a-url', // invalid format
        'http://8.8.8.8:53', // public IP
      ]

      invalidUrls.forEach((url) => {
        expect(isValidMCPServerUrl(url)).toBe(false)
      })
    })
  })
})
