import { Request, Response, NextFunction } from 'express';
import * as submissionService from '../services/submissionService';
import { parseId, parseLanguage, requireString } from '../utils/validation';

export async function listSubmissions(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = parseId(req.query.studentId, 'studentId');
    res.json(await submissionService.listByStudent(studentId));
  } catch (error) {
    next(error);
  }
}

export async function startAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = parseId(req.body?.studentId, 'studentId');
    const assessmentId = parseId(req.body?.assessmentId, 'assessmentId');
    const submission = await submissionService.startAssessment(studentId, assessmentId);
    res.status(201).json(submission);
  } catch (error) {
    next(error);
  }
}

export async function submitSolution(req: Request, res: Response, next: NextFunction) {
  try {
    const assessmentSubmissionId = parseId(req.params.id, 'id');
    const result = await submissionService.submitSolution({
      assessmentSubmissionId,
      questionId: parseId(req.body?.questionId, 'questionId'),
      code: requireString(req.body?.code, 'code'),
      language: parseLanguage(req.body?.language),
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function completeAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id, 'id');
    const submission = await submissionService.completeAssessment(id);
    res.json(submission);
  } catch (error) {
    next(error);
  }
}

export async function getSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id, 'id');
    const detail = await submissionService.getSubmissionDetail(id);
    res.json(detail);
  } catch (error) {
    next(error);
  }
}
