import { Request, Response, NextFunction } from 'express';
import * as questionService from '../services/questionService';
import { badRequest } from '../middleware/errorHandler';
import {
  optionalString,
  parseId,
  parseLanguage,
  requireString,
} from '../utils/validation';

export async function listQuestions(_req: Request, res: Response, next: NextFunction) {
  try {
    const questions = await questionService.listQuestions();
    res.json(questions);
  } catch (error) {
    next(error);
  }
}

export async function getQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id, 'id');
    const question = await questionService.getQuestion(id);
    res.json(question);
  } catch (error) {
    next(error);
  }
}

export async function createQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const { createdBy, title, description, points, starterCode, testCases } = req.body;

    if (!Array.isArray(testCases)) {
      throw badRequest('testCases must be an array');
    }

    const question = await questionService.createQuestion({
      createdBy: parseId(createdBy, 'createdBy'),
      title: requireString(title, 'title'),
      description: requireString(description, 'description'),
      points: parseId(points, 'points'),
      starterCode: optionalString(starterCode, 'starterCode'),
      testCases: testCases.map((testCase, index) => ({
        inputValue: requireString(testCase?.inputValue, `testCases[${index}].inputValue`),
        expectedOutput: requireString(
          testCase?.expectedOutput,
          `testCases[${index}].expectedOutput`
        ),
        isVisible: testCase?.isVisible !== false,
      })),
    });

    res.status(201).json(question);
  } catch (error) {
    next(error);
  }
}

export async function runQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id, 'id');
    const result = await questionService.runQuestion(
      id,
      requireString(req.body?.code, 'code'),
      parseLanguage(req.body?.language)
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}
