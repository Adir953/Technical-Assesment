import { Request, Response, NextFunction } from 'express';
import * as assessmentService from '../services/assessmentService';import { optionalString, parseId, parseIdList, requireString } from '../utils/validation';

export async function listAssessments(_req: Request, res: Response, next: NextFunction) {
  try {
    const assessments = await assessmentService.listAssessments();
    res.json(assessments);
  } catch (error) {
    next(error);
  }
}

export async function getAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id, 'id');
    const assessment = await assessmentService.getAssessment(id);
    res.json(assessment);
  } catch (error) {
    next(error);
  }
}

export async function createAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const { createdBy, title, description, durationMinutes, questionIds } = req.body;

    const assessment = await assessmentService.createAssessment({
      createdBy: parseId(createdBy, 'createdBy'),
      title: requireString(title, 'title'),
      description: optionalString(description, 'description'),
      durationMinutes: parseId(durationMinutes, 'durationMinutes'),
      questionIds: parseIdList(questionIds, 'questionIds'),
    });

    res.status(201).json(assessment);
  } catch (error) {
    next(error);
  }
}
